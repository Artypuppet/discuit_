package server

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/httputil"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gomodule/redigo/redis"
	"github.com/gorilla/websocket"
)

type PingPong struct {
	Type string        `json:"type"`
	Msg  *core.Message `json:"msg"`
	Conv *core.Convs   `json:"conv"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,

	// We'll need to check the origin of our connection
	// this will allow us to make requests from our React
	// development server to here.
	// For now, we'll do no checking and just allow any connection
	CheckOrigin: func(r *http.Request) bool { return true },
}

func (s *Server) publishNewConv(c *core.Convs) {
	conn := s.redisPool.Get()
	defer conn.Close()

	message := PingPong{
		Type: "New Conv",
		Conv: c,
	}
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshalling message: %v", err)
		return
	}

	// user2 is always the target user.
	_, err = conn.Do("PUBLISH", c.User2ID.String(), data)
	if err != nil {
		log.Printf("Error publishing message: %v", err)
	}
}

// /api/users/{username}/convs [GET, POST]
func (s *Server) handleConvs(w *responseWriter, r *request) error {

	var (
		username     = strings.ToLower(r.muxVar("username"))
		user         *core.User
		userIsViewer = false
		err          error
	)

	user, err = core.GetUserByUsername(r.ctx, s.db, username, r.viewer)
	if err != nil {
		return err
	}

	if r.loggedIn {
		if user.ID == *r.viewer {
			userIsViewer = true
		}
	}

	// payload := struct{
	// 	conv *core.Convs `json:"newConv"`
	// 	convs []*core.Convs	`json:"allConvs"`
	// }{}

	if r.req.Method == "POST" {
		// Create a new convs.

		if !r.loggedIn {
			return errNotLoggedIn
		}

		if !userIsViewer {
			return httperr.NewForbidden("not-your-conv", "Not your conversations.")
		}

		form := struct {
			StarterID uid.ID `json:"starterId"` // starter is the same user as the user
			TargetID  uid.ID `json:"targetId"`
		}{}
		if err := r.unmarshalJSONBody(&form); err != nil {
			return err
		}

		targetUser, err := core.GetUser(r.ctx, s.db, form.TargetID, &form.TargetID)
		if err != nil {
			return err
		}

		conv, err := core.CreateConv(r.ctx, s.db, user, targetUser)

		if err != nil {
			return err
		}
		// notify the target user about the new conv.
		s.publishNewConv(conv)

		w.writeJSON(conv)
		return nil
	}

	convs, err := core.GetUsersConvs(r.ctx, s.db, &user.ID)
	if err != nil {
		return err
	}

	w.writeJSON(convs)
	return nil
}

// /api/users/{username}/convs/{convId} [GET]
func (s *Server) handleConvMessages(w *responseWriter, r *request) error {
	convIdStr := r.muxVar("convId")
	convId, err := uid.FromString(convIdStr)
	if err != nil {
		return err
	}
	msgs, err := core.GetConvMessages(r.ctx, s.db, convId)
	if err != nil {
		return err
	}

	w.writeJSON(msgs)
	return nil
}

// /api/users/{username}/conn [GET]
func (s *Server) handleChat(w *responseWriter, r *request) error {
	wupgrade := w.w
	gzipResponseWriter, ok := wupgrade.(httputil.GzipResponseWriter)
	if !ok {
		return errors.New("Response Writer is not GzipResponseWriter.")
	}

	r.req.Header.Del("Sec-WebSocket-Extensions")
	username := r.muxVar("username")
	user, err := core.GetUserByUsername(r.ctx, s.db, username, r.viewer)
	if err != nil {
		return err
	}

	// upgrade the connection
	ws, err := upgrader.Upgrade(gzipResponseWriter.ResponseWriter, r.req, nil)
	if err != nil {
		return err
	}

	// starting go routines to read user's messages and to listen to messages froms others.
	go s.writeMessages(user, ws)
	go s.readMessages(user, ws)
	return nil
}

// writeMessages creates a redis subscription pool where users can send messages.
// Then it listens for messages sent to it so that it can send them back to the user.
func (s *Server) writeMessages(user *core.User, conn *websocket.Conn) {
	rconn := s.redisPool.Get()
	defer conn.Close()

	psc := redis.PubSubConn{Conn: rconn}
	psc.Subscribe(user.ID.String())

	for {
		switch v := psc.Receive().(type) {
		case redis.Message:

			message := PingPong{}
			err := json.Unmarshal(v.Data, &message)
			if err != nil {
				log.Printf("Error unmarshalling message: %v", err)
				break
			}

			err = conn.WriteJSON(message)
			if err != nil {
				log.Printf("Error writing message: %v, username: %s", err, user.Username)
				break
			}
		case error:
			log.Printf("Error: %v", v)
			return
		}
	}
}

// readMessages reads the messages sent by the user. It saves them to the database before
// publishing them to the appropriate target. If there's an error while reading the connection
// we end the this function and send an ending message to writeMessages so that it can end as well.
func (s *Server) readMessages(user *core.User, conn *websocket.Conn) {
	for {
		msgTemp := &struct {
			ConvID     uid.ID `json:"convId"`
			SenderID   uid.ID `json:"senderId"`
			ReceiverID uid.ID `json:"receiverId"`
			Body       string `json:"body"`
		}{}
		err := conn.ReadJSON(&msgTemp)
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				log.Println("connection closed by client:", err)
			} else {
				log.Println("read error:", err)
			}

			// This will cause an error in writeMessages since the msg is not json encoded
			// Since its an error we end the that go routine alongside this one.
			s.publishEndMessage(user.ID, []byte("End"))
			break
		}
		// Create a new context for the database operation
		ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
		defer cancel()

		msg, err := core.CreateMessage(ctx, s.db, msgTemp.ConvID, msgTemp.SenderID, msgTemp.ReceiverID, msgTemp.Body)
		if err != nil {
			log.Printf("Error saving message: %v", err)
			return
		}
		s.publishMessage(msg)

	}
}

// publishMessage sends the given message to the receiver
func (s *Server) publishMessage(msg *core.Message) {
	conn := s.redisPool.Get()
	defer conn.Close()

	message := PingPong{
		Type: "New Msg",
		Msg:  msg,
	}
	data, err := json.Marshal(&message)
	if err != nil {
		log.Printf("Error marshalling message: %v", err)
		return
	}

	_, err = conn.Do("PUBLISH", msg.ReceiverID.String(), data)
	if err != nil {
		log.Printf("Error publishing message: %v", err)
	}
}

// publishEndMessage is a variation to send a non-json encoded message.
func (s *Server) publishEndMessage(recieverId uid.ID, msg []byte) {
	conn := s.redisPool.Get()
	defer conn.Close()

	_, err := conn.Do("PUBLISH", recieverId.String(), msg)
	if err != nil {
		log.Printf("Error publishing message: %v", err)
	}
}

package server

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/discuitnet/discuit/core"
	"github.com/discuitnet/discuit/internal/httperr"
	"github.com/discuitnet/discuit/internal/uid"
	"github.com/gomodule/redigo/redis"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  4096,
	WriteBufferSize: 4096,

	// We'll need to check the origin of our connection
	// this will allow us to make requests from our React
	// development server to here.
	// For now, we'll do no checking and just allow any connection
	CheckOrigin: func(r *http.Request) bool { return true },
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

		w.writeJSON(conv)
		return nil
	}

	convs, err := core.GetUsersConvs(r.ctx, s.db, user.ID)
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

// /api/users/{username}/convs/conn [GET]
func (s *Server) handleChat(w *responseWriter, r *request) error {
	username := r.muxVar("username")
	user, err := core.GetUserByUsername(r.ctx, s.db, username, r.viewer)
	if err != nil {
		return err
	}

	// upgrade the connection
	ws, err := upgrader.Upgrade(w, r.req, r.req.Header)
	if err != nil {
		return err
	}

	// starting go routines to read user's messages and to listen to messages froms others.
	go s.writeMessages(r.ctx, user, ws)
	go s.readMessages(r.ctx, user, ws)
	return nil
}

// writeMessages creates a redis subscription pool where users can send messages.
// Then it listens for messages sent to it so that it can send them back to the user.
func (s *Server) writeMessages(ctx context.Context, user *core.User, conn *websocket.Conn) {
	rconn := s.redisPool.Get()
	defer conn.Close()

	psc := redis.PubSubConn{Conn: rconn}
	psc.Subscribe(user.ID.String())

	for {
		switch v := psc.Receive().(type) {
		case redis.Message:
			var msg core.Message
			err := json.Unmarshal(v.Data, &msg)
			if err != nil {
				log.Printf("Error unmarshalling message: %v", err)
				break
			}

			err = conn.WriteJSON(msg)
			if err != nil {
				log.Printf("Error writing message: %v", err)
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
func (s *Server) readMessages(ctx context.Context, user *core.User, conn *websocket.Conn) {
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

	data, err := json.Marshal(msg)
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

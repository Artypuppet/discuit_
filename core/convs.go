package core

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/discuitnet/discuit/internal/httperr"
	msql "github.com/discuitnet/discuit/internal/sql"
	"github.com/discuitnet/discuit/internal/uid"
)

// TODO Update the schema to also include LastUpdated
type Convs struct {
	ID              uid.ID       `json:"id"`
	User1ID         uid.ID       `json:"user1Id"`
	Username1       string       `json:"username1"` // Not in the table
	User2ID         uid.ID       `json:"user2Id"`
	Username2       string       `json:"username2"` // Not in the table
	StartedAt       time.Time    `json:"startedAt"`
	LastMessage     uid.ID       `json:"lastMessage"`
	LastUpdated     sql.NullTime `json:"lastUpdated"`
	LastSeenByUser1 sql.NullTime `json:"lastSeenByUser1"`
	LastSeenByUser2 sql.NullTime `json:"lastSeenByUser2"`
	NumMessages     uint64       `json:"numMessages"`
}

// getConvs executes a Select query by using the where parameter.
func getConvs(ctx context.Context, db *sql.DB, where string, args ...any) ([]*Convs, error) {
	query := msql.BuildSelectQuery("convs", []string{
		"convs.id",
		"convs.user1_id",
		"u1.username",
		"convs.user2_id",
		"u2.username",
		"convs.started_at",
		"convs.last_message",
		"convs.last_updated",
		"convs.last_seen_by_user1",
		"convs.last_seen_by_user2",
		"convs.num_msgs",
	}, []string{
		"INNER JOIN users as u1 on convs.user1_id = u1.id",
		"INNER JOIN users as u2 on convs.user2_id = u2.id",
	}, where)

	rows, err := db.QueryContext(ctx, query, args...)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	convs := []*Convs{}
	for rows.Next() {
		conv := &Convs{}
		err = rows.Scan(
			&conv.ID,
			&conv.User1ID,
			&conv.Username1,
			&conv.User2ID,
			&conv.Username2,
			&conv.StartedAt,
			&conv.LastMessage,
			&conv.LastSeenByUser1,
			&conv.LastSeenByUser2,
			&conv.NumMessages,
		)
		if err != nil {
			return nil, err
		}
		convs = append(convs, conv)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return convs, nil
}

// GetUsersConvs returns all the convs of the user. The convs are sorted in
// by
func GetUsersConvs(ctx context.Context, db *sql.DB, userId uid.ID) ([]*Convs, error) {
	convs, err := getConvs(ctx, db, "WHERE convs.user1_id = ? OR convs.user2_id = ? ORDER BY convs.last_updated DESC", userId)
	if err != nil {
		return nil, err
	}
	if len(convs) == 0 {
		return nil, httperr.NewNotFound("convs-not-found", "Conversations not found.")
	}
	return convs, nil
}

// GetConvUserIDs returns the conv with the given user ids
func GetConvUserIDs(ctx context.Context, db *sql.DB, user1ID, user2ID uid.ID) (*Convs, error) {
	convs, err := getConvs(ctx, db, "WHERE convs.user1_id = ? AND convs.user2_id = ?", user1ID, user2ID)
	if err != nil {
		return nil, err
	}
	if len(convs) == 0 {
		return nil, httperr.NewNotFound("conv-not-found", "Conversation not found.")
	}
	return convs[0], err
}

func GetConvID(ctx context.Context, db *sql.DB, id uid.ID) (*Convs, error) {
	convs, err := getConvs(ctx, db, "WHERE convs.id = ?", id)
	if err != nil {
		return nil, err
	}
	if len(convs) == 0 {
		return nil, httperr.NewNotFound("conv-not-found", "Conversation not found.")
	}
	return convs[0], nil
}

// CreateConv creates a new conversation between the given user ids if the conv
// does not already exist.
func CreateConv(ctx context.Context, db *sql.DB, starter, target *User) (*Convs, error) {
	// check if the starter has been muted by the target.
	muted, err := target.MutedBy(ctx, db, starter.ID)
	if err != nil {
		return nil, err
	}
	if !muted {
		return nil, httperr.NewBadRequest("conv/user-muted", "User has muted you.")
	}

	var conv Convs
	conv.ID = uid.New()
	conv.User1ID = starter.ID
	conv.Username1 = starter.Username
	conv.User2ID = target.ID
	conv.Username2 = target.Username
	// TODO Remove StartedBy
	conv.NumMessages = 0

	query, args := msql.BuildInsertQuery("convs", []msql.ColumnValue{
		{Name: "id", Value: conv.ID},
		{Name: "user1_id", Value: conv.User1ID},
		{Name: "user2_id", Value: conv.User2ID},
		{Name: "num_msgs", Value: conv.NumMessages},
	})
	_, err = db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	if err != nil && msql.IsErrDuplicateErr(err) {
		return nil, &httperr.Error{
			HTTPStatus: http.StatusConflict,
			Code:       "duplicate-conv",
			Message:    "A conversation between these users already exists.",
		}
	}
	return &conv, nil
}

// Update updates the last_message, last_seen_by_user fields, and num_msgs of the convs object.
func (c *Convs) Update(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `
		UPDATE convs SET
			last_message = ?,
			last_seen_by_user1 = ?,
			last_seen_by_user2 = ?,
			num_msgs = ?
		WHERE convs.id = ?`,
		c.LastMessage,
		c.LastSeenByUser1,
		c.LastSeenByUser2,
		c.LastMessage,
		c.ID)
	return err
}

// UnmarshallUpdatableFieldsJSON extracts the updatable values of a conv
// from the encoded JSON string.
func (c *Convs) UnmarshallUpdatableFieldsJSON(data []byte) error {
	temp := *c // shallow copy
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}
	c.LastMessage = temp.LastMessage
	c.LastSeenByUser1 = temp.LastSeenByUser1
	c.LastSeenByUser2 = temp.LastSeenByUser2
	c.NumMessages = temp.NumMessages
	return nil
}

// Delete deletes the conversation from the database

type Message struct {
	ID         uid.ID          `json:"id"`
	ConvID     uid.ID          `json:"convId"`
	SenderID   uid.ID          `json:"senderId"`
	ReceiverID uid.ID          `json:"receiverId"`
	SentAt     time.Time       `json:"sentAt"`
	Seen       bool            `json:"seen"`
	Body       msql.NullString `json:"body"`
}

func getMessages(ctx context.Context, db *sql.DB, where string, args ...any) ([]*Message, error) {
	query := msql.BuildSelectQuery("msg", []string{
		"msg.id",
		"msg.conv_id",
		"msg.sender_id",
		"msg.receiver_id",
		"msg.sent_at",
		"msg.seen",
		"msg.body",
	}, []string{}, where)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	msgs := []*Message{}
	for rows.Next() {
		msg := &Message{}
		err = rows.Scan(
			&msg.ID,
			&msg.ConvID,
			&msg.SenderID,
			&msg.ReceiverID,
			&msg.SentAt,
			&msg.Seen,
			&msg.Body,
		)
		if err != nil {
			return nil, err
		}
		msgs = append(msgs, msg)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return msgs, nil
}

// GetConvMessages returns all the messages that belong to the given conv
func GetConvMessages(ctx context.Context, db *sql.DB, convId uid.ID) ([]*Message, error) {
	msgs, err := getMessages(ctx, db, "WHERE msg.conv_id = ? ORDER BY MS", convId)
	if err != nil {
		return nil, err
	}
	if len(msgs) == 0 {
		return nil, httperr.NewNotFound("msgs-not-found", "Messages not found for this conversation.")
	}
	return msgs, nil
}

// GetMessage returns the message with the given id
func GetMessage(ctx context.Context, db *sql.DB, id uid.ID) (*Message, error) {
	msgs, err := getMessages(ctx, db, "WHERE msg.id = ?", id)
	if err != nil {
		return nil, err
	}
	if len(msgs) == 0 {
		return nil, httperr.NewNotFound("msg-not-found", "Message not found.")
	}
	return msgs[0], nil
}

// CreateMessage creates a new message with the given parameters and inserts it
// into the table.
func CreateMessage(ctx context.Context, db *sql.DB, convId, senderId, receiverId uid.ID, body string) (*Message, error) {
	var msg Message
	msg.ID = uid.New()
	msg.ConvID = convId
	msg.SenderID = senderId
	msg.ReceiverID = receiverId
	msg.Body = msql.NewNullString(body)

	query, args := msql.BuildInsertQuery("msg", []msql.ColumnValue{
		{Name: "id", Value: msg.ID},
		{Name: "conv_id", Value: msg.ConvID},
		{Name: "sender_id", Value: msg.SenderID},
		{Name: "receiver_id", Value: msg.ReceiverID},
		{Name: "body", Value: msg.Body},
	})
	_, err := db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	if err != nil && msql.IsErrDuplicateErr(err) {
		return nil, &httperr.Error{
			HTTPStatus: http.StatusConflict,
			Code:       "duplicate-row",
			Message:    "This message already exists.",
		}
	}
	return &msg, nil
}

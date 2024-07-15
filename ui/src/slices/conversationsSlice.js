const initialState = {
  convs: {
    /*
        ["convId"]: {
            id: string
            user1Id: string
            username1: string
            user2Id: string
            username2: string
            startedAt: Date
            lastMessage: string
            lastUpdated: Date
            LastSeenByUser1: Date
            LastSeenByUser2: Date
            numMessages: number
            messages: []
        }
        */
  },
};

const typeConvsAdded = 'convs/convsAdded';
const typeConvMessageAdded = 'convs/convMessageAdded';
const typeConvAdded = 'convs/convAdded';

// When the initial request is made we also retrieve the users conversations.
export const convsAdded = (convs) => {
  return { type: typeConvsAdded, payload: convs };
};

// When a new message is sent or received by the user.
export const convMessageAdded = (convId, message) => {
  return { type: typeConvMessageAdded, payload: { convId, message } };
};

// When a new conversation is added by the user.
export const convAdded = (conv) => {
  return { type: typeConvAdded, payload: conv };
};

export default function convsReducer(state = initialState, action) {
  switch (action.type) {
    case typeConvsAdded: {
      const convs = action.payload;
      convs.forEach((element) => {
        element.message = [];
      });
      const convIdPairs = convs.map((conv) => {
        const id = conv.id;
        return { id: conv };
      });
      return {
        ...state,
        convs: {
          ...convIdPairs,
        },
      };
    }
    case typeConvMessageAdded: {
      const { convId, message } = action.payload;
      return {
        ...state,
        convs: {
          ...state.convs,
          [convId]: {
            ...state.convs[convId],
            messages: [...state.convs[convId].message, message],
          },
        },
      };
    }
    case typeConvAdded: {
      const conv = action.payload;
      const convId = conv.id;
      return {
        ...state,
        convs: {
          ...state.convs,
          [convId]: {
            ...conv,
          },
        },
      };
    }
    default:
      return state;
  }
}

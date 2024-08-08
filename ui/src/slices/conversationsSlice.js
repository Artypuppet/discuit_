const initialState = {
  convs: {
    /*
        ["convId"]: {
            messages: []
        }
        */
  },
  convsList: [],
  newConv: {},
};

const typeConvsAdded = 'convs/convsAdded';
const typeConvMessageAdded = 'convs/convMessageAdded';
const typeConvAdded = 'convs/convAdded';
const typeNewConvAdded = 'convs/newConvAdded';
const typeUpdateConvHasNewMessage = 'convs/updateHasNewMessage';

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

// When a new conversation is started we hold a dummy newConv
export const newConvAdded = (conv) => {
  return { type: typeNewConvAdded, payload: conv };
};
// When a conversation has a new message and we need to update the conv has new message field
// to shot the notification dot
export const updateHasNewMessage = (newMessage) => {
  return { type: typeUpdateConvHasNewMessage, paylod: newMessage };
};

export default function convsReducer(state = initialState, action) {
  switch (action.type) {
    case typeConvsAdded: {
      const convs = action.payload;

      convs.forEach((element) => {
        element.hasNewMessage = false;
      });
      if (convs.length != 0) {
        const convIdPairs = convs.reduce((o, conv) => {
          o[conv.id] = [];
          return o;
        });
        return {
          ...state,
          convs: {
            ...convIdPairs,
          },
          convsList: convs,
        };
      }
      return state;
    }
    case typeConvMessageAdded: {
      const { convId, message } = action.payload;
      return {
        ...state,
        convs: {
          ...state.convs,
          [convId]: [...state.convs[(convId, message)]],
        },
      };
    }
    case typeConvAdded: {
      const conv = action.payload;
      conv.hasNewMessage = true;
      return {
        ...state,
        convs: {
          ...state.convs,
        },
        convsList: [...state.convsList, conv],
      };
    }
    case typeNewConvAdded: {
      const conv = action.payload;
      const newState = {
        ...state,
        newConv: conv,
      };
      return newState;
    }
    case typeUpdateConvHasNewMessage: {
      const newMessage = action.paylod;
      const convs = state.convsList;
      convs.forEach((element) => {
        if (element.id === newMessage.convId) {
          element.hasNewMessage = true;
        }
      });
      return {
        ...state,
        convsList: [...state.convsList],
      };
    }
    default:
      return state;
  }
}

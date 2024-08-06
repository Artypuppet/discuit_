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

export default function convsReducer(state = initialState, action) {
  switch (action.type) {
    case typeConvsAdded: {
      const convs = action.payload;

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
    default:
      return state;
  }
}

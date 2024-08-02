const initialState = {
  convs: {
    /*
        ["convId"]: {
            messages: []
        }
        */
  },
  convsList: [],
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

      if (convs.length != 0) {
        convIdPairs = convs.reduce((o, conv) => {
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
      const convId = conv.id;
      return {
        ...state,
        convs: {
          ...state.convs,
          [convId]: [],
        },
        convsList: [...state.convsList, conv],
      };
    }
    default:
      return state;
  }
}

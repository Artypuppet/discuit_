import { applyMiddleware, createStore } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import rootReducer from './reducer';

const store = createStore(rootReducer, composeWithDevTools(applyMiddleware(thunkMiddleware)));
if (process.env.NODE_ENV !== 'production' && module.hot) {
  module.hot.accept('./reducer', () => store.replaceReducer(rootReducer));
}

export default store;

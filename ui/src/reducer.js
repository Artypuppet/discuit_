import { combineReducers } from 'redux';
import commentsReducer from './slices/commentsSlice';
import communitiesReducer from './slices/communitiesSlice';
import feedsReducer from './slices/feedsSlice';
import mainReducer from './slices/mainSlice';
import postsReducer from './slices/postsSlice';
import usersReducer from './slices/usersSlice';
import listsReducer from './slices/listsSlice';
import convsReducer from './slices/conversationsSlice';

const rootReducer = combineReducers({
  main: mainReducer,
  posts: postsReducer,
  feeds: feedsReducer,
  comments: commentsReducer,
  communities: communitiesReducer,
  users: usersReducer,
  lists: listsReducer,
  convs: convsReducer,
});

export default rootReducer;

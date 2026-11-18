import { initialState, reduce, type GameState } from './engine';

export function preparedGame(state: GameState = initialState()): GameState {
  let next = reduce(state, { type: 'create-email', handle: 'nightowl' });
  next = reduce(next, { type: 'open-bank-account' });
  return reduce(next, { type: 'complete-tutorial' });
}

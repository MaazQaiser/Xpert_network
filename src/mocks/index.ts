import { db } from './store/db';
import { resetControls } from './controls';

export { db } from './store/db';
export type { DemoState } from './store/db';
export {
  getControls,
  setControls,
  resetControls,
  subscribeControls,
  DEFAULT_CONTROLS,
} from './controls';
export type { PrototypeControls, CoverageScenario } from './controls';
export { USERS, PERSONA_SUMMARY } from './fixtures/users';

/** Toolbar "Reset demo": wipe data and toggles back to the seed. */
export function resetDemo(): void {
  db.reset();
  resetControls();
}

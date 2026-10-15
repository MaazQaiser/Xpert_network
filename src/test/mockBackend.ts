/** Test-only access to the mock backend, so feature tests don't import src/mocks directly. */
export { db } from '@/mocks/store/db';
export { setControls, resetControls } from '@/mocks/controls';
export { USERS } from '@/mocks/fixtures/users';
export { scenarios } from '@/mocks/scenarios';

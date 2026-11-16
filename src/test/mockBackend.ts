/** Test-only access to the mock backend, so feature tests don't import src/mocks directly. */
export { db } from '@/mocks/store/db';
export { setControls, resetControls } from '@/mocks/controls';
export { USERS } from '@/mocks/fixtures/users';
export { scenarios } from '@/mocks/scenarios';
export { server } from '@/mocks/node';
export { scioChatTitle, seedScioChat } from '@/mocks/handlers/scio.handlers';
export { seedRequirements } from '@/mocks/handlers/requirements.handlers';
export { CAFE_SEARCH, scriptSearch, seedSearch } from '@/mocks/handlers/search.handlers';
export type { SearchScript } from '@/mocks/handlers/search.handlers';
export { adminDemoState, loadAdminDemo, loadListProjects } from './adminDemo';

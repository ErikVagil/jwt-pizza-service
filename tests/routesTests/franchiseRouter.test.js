const request = require('supertest');
const app = require('../../src/service');
const { Role, DB } = require('../../src/database/database.js');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

async function logInAdmin() {
  const admin = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(admin);
  const adminID = loginRes.body.user.id;
  const adminAuthToken = loginRes.body.token;
  return { admin, adminID, adminAuthToken };
}

async function registerUser() {
  const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  return { user: registerRes.body.user, userAuthToken: registerRes.body.token};
}

async function postFranchise(user, userAuthToken) {
  const createRes = await request(app)
                            .post('/api/franchise')
                            .set('Authorization', `Bearer ${userAuthToken}`)
                            .send({ 'name': 'test franchise', 'admins': [{ 'email': user.email }] });
  return createRes.body.id;
}

async function postFranchiseStore(user, userAuthToken) {
  const franchiseID = await postFranchise(user, userAuthToken);
  const createRes = await request(app)
                            .post(`/api/franchise/${franchiseID}/store`)
                            .set('Authorization', `Bearer ${userAuthToken}`)
                            .send({ franchiseId: franchiseID, name: randomName() });
  return { id: createRes.body.id, franchiseID: createRes.body.franchiseId };
}

test('get franchises', async () => {
  const getRes = await request(app).get('/api/franchise');
  expect(getRes.body).not.toBeNull();
});

test('get user franchises', async () => {
  const { adminID, adminAuthToken } = await logInAdmin();
  const getUserRes = await request(app).get(`/api/franchise/${adminID}`).set('Authorization', `Bearer ${adminAuthToken}`);
  expect(getUserRes.body).not.toBeNull();
});

test('create franchise', async () => {
  const { admin, adminAuthToken } = await logInAdmin();
  const createRes = await request(app)
                            .post('/api/franchise')
                            .set('Authorization', `Bearer ${adminAuthToken}`)
                            .send({ 'name': 'test franchise', 'admins': [{ 'email': admin.email }] });
  expect(createRes.body).not.toBeNull();
});

test('create franchise unauthorized', async () => {
  const { user, userAuthToken } = await registerUser();
  const createRes = await request(app)
                            .post('/api/franchise')
                            .set('Authorization', `Bearer ${userAuthToken}`)
                            .send({ 'name': 'test franchise', 'admins': [{ 'email': user.email }] });
  expect(createRes.status).toEqual(403);
});

test('delete franchise', async () => {
  const { admin, adminAuthToken } = await logInAdmin();
  const franchiseID = await postFranchise(admin, adminAuthToken);
  const createRes = await request(app)
                            .delete(`/api/franchise/${franchiseID}`)
                            .set('Authorization', `Bearer ${adminAuthToken}`);
  expect(createRes.body).toHaveProperty('message', 'franchise deleted');
});

test('delete franchise unauthorized', async () => {
  const { user, userAuthToken } = await registerUser();
  const franchiseID = await postFranchise(user, userAuthToken);
  const createRes = await request(app)
                            .delete(`/api/franchise/${franchiseID}`)
                            .set('Authorization', `Bearer ${userAuthToken}`);
  expect(createRes.status).toEqual(403);
});

test('create franchise store', async () => {
  const { admin, adminAuthToken } = await logInAdmin();
  const franchiseID = await postFranchise(admin, adminAuthToken);
  const createRes = await request(app)
                            .post(`/api/franchise/${franchiseID}/store`)
                            .set('Authorization', `Bearer ${adminAuthToken}`)
                            .send({ franchiseId: franchiseID, name: randomName() });
  expect(createRes.body).not.toBeNull();
});

test('create franchise store unauthorized', async () => {
  const { admin, adminAuthToken } = await logInAdmin();
  const { userAuthToken } = await registerUser();
  const franchiseID = await postFranchise(admin, adminAuthToken);
  const createRes = await request(app)
                            .post(`/api/franchise/${franchiseID}/store`)
                            .set('Authorization', `Bearer ${userAuthToken}`)
                            .send({ franchiseId: franchiseID, name: randomName() });
  expect(createRes.status).toEqual(403);
});

test('delete franchise store', async () => {
  const { admin, adminAuthToken } = await logInAdmin();
  const { id, franchiseID} = await postFranchiseStore(admin, adminAuthToken);
  const createRes = await request(app)
                            .delete(`/api/franchise/${franchiseID}/store/${id}`)
                            .set('Authorization', `Bearer ${adminAuthToken}`);
  expect(createRes.body).not.toBeNull();
});

test('delete franchise store unauthorized', async () => {
  const { admin, adminAuthToken } = await logInAdmin();
  const { userAuthToken } = await registerUser();
  const { id, franchiseID} = await postFranchiseStore(admin, adminAuthToken);
  const createRes = await request(app)
                            .delete(`/api/franchise/${franchiseID}/store/${id}`)
                            .set('Authorization', `Bearer ${userAuthToken}`);
  expect(createRes.status).toEqual(403);
});
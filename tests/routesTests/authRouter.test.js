const request = require('supertest');
const app = require('../../src/service');
const { Role, DB } = require('../../src/database/database.js');

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken, testUserID;

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = Math.random().toString(36).substring(2, 12);
  user.email = user.name + '@admin.com';

  await DB.addUser(user);

  user.password = 'toomanysecrets';
  return user;
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserID = registerRes.body.user.id;
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
});

test('register fail', async () => {
  const badTestUser = {};
  const registerRes = await request(app).post('/api/auth').send(badTestUser);
  expect(registerRes.status).toEqual(400);
});

test('logout', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.body).toHaveProperty('message', 'logout successful');
});

test('logout without token', async () => {
  const logoutRes = await request(app).delete('/api/auth');
  expect(logoutRes.body).toHaveProperty('message', 'unauthorized');
});

test('update user', async () => {
  const admin = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(admin);
  const adminID = loginRes.body.user.id;
  const adminAuthToken = loginRes.body.token;
  const updateRes = await request(app).put(`/api/auth/${adminID}`).set('Authorization', `Bearer ${adminAuthToken}`).send({ 'email': admin.email, 'password': 'newpassword' });
  expect(updateRes.body).toHaveProperty('id');
  expect(updateRes.body).toHaveProperty('name');
  expect(updateRes.body).toHaveProperty('email');
  expect(updateRes.body).toHaveProperty('roles');
});
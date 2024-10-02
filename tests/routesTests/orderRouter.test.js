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

test('get menu', async () => {
  const getRes = await request(app).get('/api/order/menu');
  expect(getRes.body).not.toBeNull();
});

test('add item', async () => {
  const {adminAuthToken} = await logInAdmin();
  const addRes = await request(app)
                        .put('/api/order/menu')
                        .set('Authorization', `Bearer ${adminAuthToken}`)
                        .send({ title: randomName(), description: randomName(), image: randomName(), price: Math.random() * 10 });
  expect(addRes.body).not.toBeNull();
});

test('add item unauthorized', async () => {
  const {userAuthToken} = await registerUser();
  const addRes = await request(app)
                        .put('/api/order/menu')
                        .set('Authorization', `Bearer ${userAuthToken}`)
                        .send({ title: randomName(), description: randomName(), image: randomName(), price: Math.random() * 10 });
  expect(addRes.status).toEqual(403);
});
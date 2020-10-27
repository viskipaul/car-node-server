const Koa = require('koa');
const app = new Koa();
const server = require('http').createServer(app.callback());
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const Router = require('koa-router');
const cors = require('koa-cors');
const bodyparser = require('koa-bodyparser');

app.use(bodyparser());
app.use(cors());
app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} ${ctx.response.status} - ${ms}ms`);
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.response.body = { issue: [{ error: err.message || 'Unexpected error' }] };
    ctx.response.status = 500;
  }
});

class Car{
  constructor({id, model, year}) {
    this.id = id;
    this.model = model;
    this.year = year;
  }
}

const cars = []
cars.push(new Car({ id: '1', model: 'Dacia Logan', year: '2006'}));
cars.push(new Car({ id: '2', model: 'Volkswagen Golf', year: '2009'}));

// let lastUpdated = cars[cars.length - 1].date;
let lastId = 2
const pageSize = 10;

const broadcast = data =>
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });

const router = new Router();

router.get('/car', ctx => {
  const ifModifiedSince = ctx.request.get('If-Modif ied-Since');

  const text = ctx.request.query.text;
  const page = parseInt(ctx.request.query.page) || 1;
  ctx.response.body = cars;
  ctx.response.status = 200;
});

router.get('/car/:id', async (ctx) => {
  const carId = ctx.params.id;
  const car = cars.find(car => carId === car.id);
  if (car) {
    ctx.response.body = car;
    ctx.response.status = 200; // ok
  } else {
    ctx.response.body = { issue: [{ warning: `item with id ${carId} not found` }] };
    ctx.response.status = 404; // NOT FOUND (if you know the resource was deleted, then return 410 GONE)
  }
});

const createItem = async (ctx) => {
  const car = ctx.request.body;
  if(!car.model){
    ctx.response.body = { issue: [{ error: 'Model is missing' }] };
    ctx.response.status = 400;
  }
  if(!car.year){
    ctx.response.body = { issue: [{ error: 'Year is missing' }] };
    ctx.response.status = 400;
  }
  car.id = `${parseInt(lastId) + 1}`;
  lastId = car.id;
  cars.push(car);
  ctx.response.body = car;
  ctx.response.status = 201; // CREATED
  broadcast({ event: 'created', payload: { car } });
};

router.post('/car', async (ctx) => {
  await createItem(ctx);
});

router.put('/car/:id', async (ctx) => {
  const id = ctx.params.id;
  const car = ctx.request.body;
  const carId = car.id;
  if (carId && id !== car.id) {
    ctx.response.body = { issue: [{ error: `Param id and body id should be the same` }] };
    ctx.response.status = 400; // BAD REQUEST
    return;
  }
  if (!carId) {
    await createItem(ctx);
    return;
  }
  const index = cars.findIndex(car => car.id === id);
  if (index === -1) {
    ctx.response.body = { issue: [{ error: `item with id ${id} not found` }] };
    ctx.response.status = 400; // BAD REQUEST
    return;
  }
  cars[index] = car;
  ctx.response.body = car;
  ctx.response.status = 200; // OK
  broadcast({ event: 'updated', payload: { car } });
});

router.del('/car/:id', ctx => {
  const id = ctx.params.id;
  const index = items.findIndex(car => id === car.id);
  if (index !== -1) {
    const car = cars[index];
    cars.splice(index, 1);
    broadcast({ event: 'deleted', payload: { item } });
  }
  ctx.response.status = 204; // no content
});

// setInterval(() => {
//   lastUpdated = new Date();
//   lastId = `${parseInt(lastId) + 1}`;
//   const item = new Item({ id: lastId, text: `item ${lastId}`, date: lastUpdated, version: 1 });
//   items.push(item);
//   console.log(`
//    ${item.text}`);
//   broadcast({ event: 'created', payload: { item } });
// }, 15000);

app.use(router.routes());
app.use(router.allowedMethods());

server.listen(3000);

import Router from 'koa-router';
import carStore from './store';
import { broadcast } from "../utils";

export const router = new Router();

router.get('/', async (ctx) => {
    const response = ctx.response;
    const userId = ctx.state.user._id;
    response.body = await carStore.find({ userId });
    response.status = 200; // ok
});

router.get('/:id', async (ctx) => {
    const userId = ctx.state.user._id;
    const car = await carStore.findOne({ _id: ctx.params.id });
    const response = ctx.response;
    if (car) {
        if (car.userId === userId) {
            response.body = car;
            response.status = 200; // ok
        } else {
            response.status = 403; // forbidden
        }
    } else {
        response.status = 404; // not found
    }
});

const createCar = async (ctx, car, response) => {
    try {
        const userId = ctx.state.user._id;
        car.userId = userId;
        response.body = await carStore.insert(car);
        response.status = 201; // created
        broadcast(userId, { type: 'created', payload: car });
    } catch (err) {
        response.body = { message: err.message };
        response.status = 400; // bad request
    }
};

router.post('/', async ctx => await createCar(ctx, ctx.request.body, ctx.response));

router.put('/:id', async (ctx) => {
    const car = ctx.request.body;
    const id = ctx.params.id;
    const carId = car._id;
    const response = ctx.response;
    if (carId && carId !== id) {
        response.body = { message: 'Param id and body _id should be the same' };
        response.status = 400; // bad request
        return;
    }
    if (!carId) {
        console.log("Hello!")
        await createCar(ctx, car, response);
    } else {
        console.log("Error")
        const userId = ctx.state.user._id;
        car.userId = userId;
        const updatedCount = await carStore.update({ _id: id }, car);
        if (updatedCount === 1) {
            response.body = car;
            response.status = 200; // ok
            broadcast(userId, { type: 'updated', payload: car });
        } else {
            response.body = { message: 'Resource no longer exists' };
            response.status = 405; // method not allowed
        }
    }
});

router.del('/:id', async (ctx) => {
    const userId = ctx.state.user._id;
    const car = await carStore.findOne({ _id: ctx.params.id });
    if (car && userId !== car.userId) {
        ctx.response.status = 403; // forbidden
    } else {
        await carStore.remove({ _id: ctx.params.id });
        ctx.response.status = 204; // no content
    }
});

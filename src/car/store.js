import dataStore from 'nedb-promise';

export class CarStore {
    constructor({ filename, autoload }) {
        this.store = dataStore({ filename, autoload });
    }

    async find(props) {
        return this.store.find(props);
    }

    async findOne(props) {
        return this.store.findOne(props);
    }

    async insert(car) {
        let carModel = car.model;
        if (!carModel) { // validation
            throw new Error('Missing text property')
        }
        return this.store.insert(car);
    };

    async update(props, car) {
        return this.store.update(props, car);
    }

    async remove(props) {
        return this.store.remove(props);
    }
}

export default new CarStore({ filename: './db/cars.json', autoload: true });
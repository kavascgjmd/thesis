"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFoodDonationTable = createFoodDonationTable;
const util_1 = require("../util");
function createFoodDonationTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createFoodDonationTableQuery = `
CREATE TABLE IF NOT EXISTS food_donations (
    id SERIAL PRIMARY KEY,
    donor_id INTEGER REFERENCES donors(id),
    food_type VARCHAR(50),
    food_category VARCHAR(50),
    quantity INTEGER,
    servings INTEGER,
    weight_kg DECIMAL(10,2),
    package_size VARCHAR(50),
    expiration_time TIMESTAMP WITH TIME ZONE,
    pickup_location VARCHAR(255),
    image VARCHAR(255),
    image_url VARCHAR(255),
    image_storage VARCHAR(50),
    availability_schedule VARCHAR(255),
    status VARCHAR(50)
);
  `;
        yield (0, util_1.query)(createFoodDonationTableQuery);
    });
}

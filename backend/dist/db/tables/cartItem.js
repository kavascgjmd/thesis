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
exports.createCartItemsTable = createCartItemsTable;
const util_1 = require("../util");
function createCartItemsTable() {
    return __awaiter(this, void 0, void 0, function* () {
        const createCartItemsTableQuery = `
        CREATE TABLE IF NOT EXISTS cart_items (
       id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    food_donation_id INTEGER REFERENCES food_donations(id),
    donor_id INTEGER REFERENCES donors(id),
    quantity INTEGER DEFAULT 1,
    item_total DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    is_from_past_event BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, food_donation_id)

            
            
        );
    `;
        try {
            yield (0, util_1.query)(createCartItemsTableQuery);
            console.log('Cart items table created successfully');
        }
        catch (error) {
            console.error('Error creating cart items table:', error);
            throw error;
        }
    });
}

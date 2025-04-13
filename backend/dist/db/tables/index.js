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
exports.createAllTables = createAllTables;
const user_1 = require("./user");
const donor_1 = require("./donor");
const ngo_1 = require("./ngo");
const recipient_1 = require("./recipient");
const foodDonation_1 = require("./foodDonation");
const foodRequest_1 = require("./foodRequest");
const delivery_1 = require("./delivery");
const chat_1 = require("./chat");
const notification_1 = require("./notification");
const crmRecord_1 = require("./crmRecord");
const erpRecord_1 = require("./erpRecord");
const cart_1 = require("./cart");
const cartItem_1 = require("./cartItem");
const order_1 = require("./order");
const driver_locations_1 = require("./driver_locations");
const delivery_routes_1 = require("./delivery_routes");
const route_points_1 = require("./route_points");
const drivers_1 = require("./drivers");
const verification_logs_1 = require("./verification_logs");
function createAllTables() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, verification_logs_1.createVerficationLogsTable)();
        yield (0, driver_locations_1.createDriverLocationsTable)();
        yield (0, delivery_routes_1.createDeliveryRoutesTable)();
        yield (0, route_points_1.createRoutePointsTable)();
        yield (0, cart_1.createCartTable)();
        yield (0, cartItem_1.createCartItemsTable)();
        yield (0, order_1.createOrdersTable)();
        yield (0, user_1.createUserTable)();
        yield (0, donor_1.createDonorTable)();
        yield (0, ngo_1.createNGOTable)();
        yield (0, recipient_1.createRecipientTable)();
        yield (0, foodDonation_1.createFoodDonationTable)();
        yield (0, foodRequest_1.createFoodRequestTable)();
        yield (0, delivery_1.createDeliveryTable)();
        yield (0, chat_1.createChatTable)();
        yield (0, notification_1.createNotificationTable)();
        yield (0, crmRecord_1.createCRMRecordTable)();
        yield (0, erpRecord_1.createERPRecordTable)();
        yield (0, drivers_1.createDriversTable)();
    });
}

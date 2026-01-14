const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['assigned', 'in-transit', 'delivered', 'cancelled'],
        default: 'assigned'
    },
    estimatedTime: {
        type: Number, // in minutes
        default: null
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    deliveredAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Delivery', deliverySchema);

const mongoose = require('mongoose');
const CoinPayment = require('../models/coinPayment');

// POST /coin-payments
exports.createCoinPayment = async (req, res) => {
  try {
    const {
      mobileNumber,
      items,                 // [{ coinGrams, quantity, amount }]
      totalAmount,
      taxAmount,
      deliveryCharge,
      amountPayable,
      address,
      city,
      postCode
    } = normalizeBody(req.body);

    // Presence checks
    if (!mobileNumber) return res.status(400).json({ status: false, message: 'mobileNumber is required' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ status: false, message: 'items must be a non-empty array' });
    if (totalAmount == null || taxAmount == null || deliveryCharge == null || amountPayable == null)
      return res.status(400).json({ status: false, message: 'totalAmount, taxAmount, deliveryCharge, amountPayable are required' });
    if (!address || !city || !postCode) return res.status(400).json({ status: false, message: 'address, city, postCode are required' });

    // Validate line items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.coinGrams == null || it.quantity == null || it.amount == null) {
        return res.status(400).json({ status: false, message: `items[${i}] must include coinGrams, quantity, amount` });
      }
      if (Number(it.coinGrams) < 0) return res.status(400).json({ status: false, message: `items[${i}].coinGrams must be >= 0` });
      if (!Number.isInteger(Number(it.quantity)) || Number(it.quantity) <= 0) return res.status(400).json({ status: false, message: `items[${i}].quantity must be a positive integer` });
      if (Number(it.amount) < 0) return res.status(400).json({ status: false, message: `items[${i}].amount must be >= 0` });
    }

    // Optional integrity check: recompute subtotal
    const computedItemsSubtotal = items.reduce((s, it) => s + Number(it.amount), 0);
    const computedPayable = computedItemsSubtotal + Number(taxAmount) + Number(deliveryCharge);
    if (Number(totalAmount) !== computedItemsSubtotal) {
      return res.status(400).json({ status: false, message: 'totalAmount must equal sum of items.amount' });
    }
    if (Number(amountPayable) !== computedPayable) {
      return res.status(400).json({ status: false, message: 'amountPayable must equal totalAmount + taxAmount + deliveryCharge' });
    }

    const doc = await CoinPayment.create({
      mobileNumber,
      items,
      totalAmount: Number(totalAmount),
      taxAmount: Number(taxAmount),
      deliveryCharge: Number(deliveryCharge),
      amountPayable: Number(amountPayable),
      address,
      city,
      postCode,
      status: 'Approval Pending'
    });

    return res.status(201).json({ status: true, message: 'Coin payment created (Approval Pending)', data: doc });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Internal server error', error: error.message });
  }
};

// GET /coin-payments
// Supports ?page=&limit=&status=&mobile=
exports.getAllCoinPayment = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '20', 10), 1);
    const skip = (page - 1) * limit;

    // Group by mobileNumber and return the latest record
    const pipeline = [
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$mobileNumber",
          latestPayment: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$latestPayment" } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const data = await CoinPayment.aggregate(pipeline);

    // Total unique users/payments
    const total = (await CoinPayment.distinct("mobileNumber")).length;

    return res.status(200).json({
      status: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message
    });
  }
};


// GET /coin-payments/:id
exports.getCoinPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ status: false, message: 'Invalid id' });

    const doc = await CoinPayment.findById(id).lean();
    if (!doc) return res.status(404).json({ status: false, message: 'Coin payment not found' });

    return res.status(200).json({ status: true, data: doc });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Internal server error', error: error.message });
  }
};

// PATCH /coin-payments/:id/approve
// Optionally accept approvedBy (user id)
exports.approveCoinPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body; // optional ObjectId

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ status: false, message: 'Invalid id' });
    if (approvedBy && !mongoose.Types.ObjectId.isValid(approvedBy)) {
      return res.status(400).json({ status: false, message: 'Invalid approvedBy' });
    }

    const doc = await CoinPayment.findById(id);
    if (!doc) return res.status(404).json({ status: false, message: 'Coin payment not found' });

    if (doc.status === 'Payment Confirmed') {
      return res.status(409).json({ status: false, message: 'Already confirmed' });
    }

    doc.status = 'Payment Confirmed';
    doc.approvedAt = new Date();
    if (approvedBy) doc.approvedBy = approvedBy;
    await doc.save();

    return res.status(200).json({ status: true, message: 'Payment Confirmed', data: doc });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Internal server error', error: error.message });
  }
};

// Helpers
function normalizeBody(body) {
  // Accepts payloads with keys like "Coin grams" and "Quantty" and maps to normalized fields
  // Supports both single object and array of items
  const normalizeItem = (raw) => ({
    coinGrams: numberOrNull(raw.coinGrams ?? raw['Coin grams']),
    quantity: numberOrNull(raw.quantity ?? raw.Quantty),
    amount: numberOrNull(raw.amount)
  });

  let items = body.items;
  if (!items) {
    // try detect loose multi-object input
    const possible = [];
    if (body.item) possible.push(body.item);
    if (Array.isArray(body.lines)) items = body.lines;
    if (!items) {
      // If user sent separate objects earlier, they should send `items: [...]` in the request.
      // Keep as-is if already an array.
    }
  }

  const normalized = {
    mobileNumber: body.mobileNumber,
    items: Array.isArray(body.items) ? body.items.map(normalizeItem) : body.items ? [normalizeItem(body.items)] : body.items,
    totalAmount: numberOrNull(body.totalAmount ?? body.TotalAmount),
    taxAmount: numberOrNull(body.taxAmount),
    deliveryCharge: numberOrNull(body.deliveryCharge ?? body.deliveryCharges),
    amountPayable: numberOrNull(body.amountPayable ?? body.AmountPayable),
    address: body.address,
    city: body.city,
    postCode: body.postCode
  };

  return normalized;
}

function numberOrNull(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}





// POST /coin-payments
exports.createCoinPayment1 = async (req, res) => {
  try {
    // --- helpers ---
    const numberOrNull = (v) => {
      if (v == null) return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    };

    // Accepts payloads with keys like "Coin grams" and "Quantty" and maps to schema fields.
    // Supports both: items: [...] OR a single item-like object in body.items
    const normalizeBody = (body) => {
      const normalizeItem = (raw) => ({
        coinGrams: numberOrNull(raw?.coinGrams ?? raw?.['Coin grams']),
        quantity: numberOrNull(raw?.quantity ?? raw?.Quantty),
        amount: numberOrNull(raw?.amount),
      });

      let items = body.items;
      if (Array.isArray(items)) {
        items = items.map(normalizeItem);
      } else if (items && typeof items === 'object') {
        items = [normalizeItem(items)];
      } else {
        // If client sent loose objects, require proper `items` array in request
        items = undefined;
      }

      return {
        mobileNumber: body.mobileNumber,
        items,
        totalAmount: numberOrNull(body.totalAmount ?? body.TotalAmount),
        taxAmount: numberOrNull(body.taxAmount),
        deliveryCharge: numberOrNull(body.deliveryCharge ?? body.deliveryCharges),
        amountPayable: numberOrNull(body.amountPayable ?? body.AmountPayable),
        investAmount: numberOrNull(body.investAmount ?? body.InvestAmount),
        address: body.address,
        city: body.city,
        postCode: body.postCode,
      };
    };

    // --- normalize incoming body ---
    const {
      mobileNumber,
      items,
      totalAmount,
      taxAmount,
      deliveryCharge,
      amountPayable,
      investAmount,
      address,
      city,
      postCode,
    } = normalizeBody(req.body);

    // --- presence checks ---
    if (!mobileNumber)
      return res.status(400).json({ status: false, message: 'mobileNumber is required' });

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ status: false, message: 'items must be a non-empty array' });

    if (totalAmount == null || taxAmount == null || deliveryCharge == null || amountPayable == null)
      return res.status(400).json({
        status: false,
        message: 'totalAmount, taxAmount, deliveryCharge, amountPayable are required',
      });

    if (investAmount == null || isNaN(Number(investAmount)) || Number(investAmount) < 0)
      return res.status(400).json({
        status: false,
        message: 'investAmount is required and must be a non-negative number',
      });

    if (!address || !city || !postCode)
      return res.status(400).json({ status: false, message: 'address, city, postCode are required' });

    // --- validate items ---
    for (let i = 0; i < items.length; i++) {
      const it = items[i];

      if (it.coinGrams == null || it.quantity == null || it.amount == null) {
        return res.status(400).json({
          status: false,
          message: `items[${i}] must include coinGrams, quantity, amount`,
        });
      }

      if (Number(it.coinGrams) < 0)
        return res.status(400).json({
          status: false,
          message: `items[${i}].coinGrams must be >= 0`,
        });

      if (!Number.isInteger(Number(it.quantity)) || Number(it.quantity) <= 0)
        return res.status(400).json({
          status: false,
          message: `items[${i}].quantity must be a positive integer`,
        });

      if (Number(it.amount) < 0)
        return res.status(400).json({
          status: false,
          message: `items[${i}].amount must be >= 0`,
        });
    }

    // --- integrity checks ---
    const itemsSubtotal = items.reduce((sum, it) => sum + Number(it.amount), 0);
    const computedPayable = itemsSubtotal + Number(taxAmount) + Number(deliveryCharge);

    if (Number(totalAmount) !== itemsSubtotal) {
      return res.status(400).json({
        status: false,
        message: 'totalAmount must equal sum of items.amount',
      });
    }

    if (Number(amountPayable) !== computedPayable) {
      return res.status(400).json({
        status: false,
        message: 'amountPayable must equal totalAmount + taxAmount + deliveryCharge',
      });
    }

    // --- create document (status defaults to "Approval Pending") ---
    const doc = await CoinPayment.create({
      mobileNumber,
      items: items.map((it) => ({
        coinGrams: Number(it.coinGrams),
        quantity: Number(it.quantity),
        amount: Number(it.amount),
      })),
      totalAmount: Number(totalAmount),
      taxAmount: Number(taxAmount),
      deliveryCharge: Number(deliveryCharge),
      amountPayable: Number(amountPayable),
      investAmount: Number(investAmount),
      address,
      city,
      postCode,
      status: 'Approval Pending',
    });

    return res
      .status(201)
      .json({ status: true, message: 'Coin payment created (Approval Pending)', data: doc });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: 'Internal server error', error: error.message });
  }
};



// GET /coin-payments/history/:mobileNumber?page=1&limit=20&status=Approval%20Pending&startDate=2025-11-01&endDate=2025-11-30
exports.getCoinPaymentHistory = async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '20', 10), 1);
    const skip = (page - 1) * limit;

    if (!mobileNumber || typeof mobileNumber !== 'string') {
      return res.status(400).json({ status: false, message: 'mobileNumber is required' });
    }

    // Build filter
    const filter = { mobileNumber };
    if (req.query.status) filter.status = req.query.status;

    // Optional date range filter on createdAt
    const { startDate, endDate } = req.query;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        // include the whole end day
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Fetch items + counts
    const [items, total] = await Promise.all([
      CoinPayment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CoinPayment.countDocuments(filter)
    ]);

    // Quick summary totals for this mobileNumber (across the filtered range)
    const summaryAgg = await CoinPayment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
          totalTax: { $sum: "$taxAmount" },
          totalDelivery: { $sum: "$deliveryCharge" },
          totalPayable: { $sum: "$amountPayable" },
          totalInvest: { $sum: "$investAmount" }
        }
      }
    ]);
    const summary = summaryAgg[0] || {
      count: 0,
      totalAmount: 0,
      totalTax: 0,
      totalDelivery: 0,
      totalPayable: 0,
      totalInvest: 0
    };

    return res.status(200).json({
      status: true,
      data: items,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Internal server error', error: error.message });
  }
};

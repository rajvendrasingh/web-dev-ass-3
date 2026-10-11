const Product = require("../models/product");



const createProduct = async (req, res) => {
    try {
        const product = await Product.create(req.body);

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};



const getAllProducts = async (req, res) => {
    try {

        const {
            category,
            minPrice,
            maxPrice,
            sortBy = "createdAt",
            order = "desc",
            page = 1,
            limit = 10
        } = req.query;

        let filter = {};

        // Category filter
        if (category) {
            filter.category = category;
        }

        // Price filter
        if (minPrice || maxPrice) {
            filter.price = {};

            if (minPrice) {
                filter.price.$gte = Number(minPrice);
            }

            if (maxPrice) {
                filter.price.$lte = Number(maxPrice);
            }
        }

        const skip = (Number(page) - 1) * Number(limit);

        const sortOrder = order === "asc" ? 1 : -1;

        const products = await Product.find(filter)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(Number(limit));

        const totalProducts = await Product.countDocuments(filter);

        res.status(200).json({
            success: true,
            page: Number(page),
            limit: Number(limit),
            totalProducts,
            totalPages: Math.ceil(totalProducts / Number(limit)),
            products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



const getProductById = async (req, res) => {
    try {

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }
};



const updateProduct = async (req, res) => {
    try {

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};



const deleteProduct = async (req, res) => {
    try {

        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }
};



const adjustStock = async (req, res) => {
    try {

        const { type, quantity } = req.body;

        if (!type || !quantity) {
            return res.status(400).json({
                success: false,
                message: "Type and quantity are required"
            });
        }

        const qty = Number(quantity);

        if (qty <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be greater than 0"
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (type === "restock") {
            product.stock += qty;
        }
        else if (type === "sale") {

            if (product.stock < qty) {
                return res.status(400).json({
                    success: false,
                    message: "Insufficient stock"
                });
            }

            product.stock -= qty;
        }
        else {
            return res.status(400).json({
                success: false,
                message: "Type must be restock or sale"
            });
        }

        await product.save();

        res.status(200).json({
            success: true,
            message: "Stock updated successfully",
            product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};



const getLowStockProducts = async (req, res) => {
    try {

        const threshold = Number(req.query.threshold) || 10;

        const products = await Product.find({
            stock: { $lte: threshold }
        });

        res.status(200).json({
            success: true,
            threshold,
            count: products.length,
            products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


const getCategorySummary = async (req, res) => {
    try {

        const summary = await Product.aggregate([
            {
                $group: {
                    _id: "$category",

                    totalProducts: {
                        $sum: 1
                    },

                    totalStock: {
                        $sum: "$stock"
                    },

                    totalInventoryValue: {
                        $sum: {
                            $multiply: ["$price", "$stock"]
                        }
                    }
                }
            },

            {
                $sort: {
                    totalInventoryValue: -1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            summary
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};



module.exports = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    adjustStock,
    getLowStockProducts,
    getCategorySummary
};
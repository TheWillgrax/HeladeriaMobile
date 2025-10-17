import { query } from "../config/db.js";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getDashboardMetrics = async () => {
  const [ordersSummary] = await query(
    `SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingOrders,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidOrders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
        SUM(CASE WHEN status <> 'cancelled' THEN total ELSE 0 END) AS totalRevenue
      FROM orders`
  );

  const [inventorySummary] = await query(
    `SELECT
        COUNT(*) AS totalProducts,
        SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS activeProducts,
        SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) AS lowStockProducts
      FROM products`
  );

  const salesByMonth = await query(
    `SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*) AS orders,
        SUM(total) AS revenue
      FROM orders
      WHERE status <> 'cancelled'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 6`
  );

  const topProducts = await query(
    `SELECT
        p.id,
        p.name,
        SUM(oi.quantity) AS unitsSold,
        SUM(oi.quantity * oi.unit_price) AS revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.status <> 'cancelled'
      GROUP BY p.id, p.name
      ORDER BY unitsSold DESC
      LIMIT 5`
  );

  return {
    summary: {
      totalOrders: Number(ordersSummary?.totalOrders || 0),
      pendingOrders: Number(ordersSummary?.pendingOrders || 0),
      paidOrders: Number(ordersSummary?.paidOrders || 0),
      cancelledOrders: Number(ordersSummary?.cancelledOrders || 0),
      totalRevenue: toNumber(ordersSummary?.totalRevenue || 0),
    },
    inventory: {
      totalProducts: Number(inventorySummary?.totalProducts || 0),
      activeProducts: Number(inventorySummary?.activeProducts || 0),
      lowStockProducts: Number(inventorySummary?.lowStockProducts || 0),
    },
    salesByMonth: salesByMonth.map((row) => ({
      month: row.month,
      orders: Number(row.orders || 0),
      revenue: toNumber(row.revenue || 0),
    })),
    topProducts: topProducts.map((row) => ({
      id: row.id,
      name: row.name,
      unitsSold: Number(row.unitsSold || 0),
      revenue: toNumber(row.revenue || 0),
    })),
  };
};

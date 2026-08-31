export const mockMetricData = {
  orders: { value: 48, trend: '+12.5%' },
  revenue: { value: 24580, trend: '+8.2%' },
  activeMenuItems: { value: 86, info: '4 unavailable' },
  occupiedTables: { current: 12, total: 18, percentage: 67 }
};

export const mockLiveOrders = [
  { id: 'ORD-1048', table: 'T08', amount: 1249, status: 'Preparing', time: '8 min' },
  { id: 'ORD-1047', table: 'T03', amount: 780, status: 'Ready', time: '12 min' },
  { id: 'ORD-1046', table: 'T11', amount: 1890, status: 'Pending', time: '2 min' },
  { id: 'ORD-1045', table: 'T05', amount: 450, status: 'Accepted', time: '15 min' }
];

export const mockPopularItems = [
  { id: 1, name: 'Margherita Pizza', orders: 42 },
  { id: 2, name: 'Paneer Tikka', orders: 36 },
  { id: 3, name: 'Veg Burger', orders: 29 },
];

export const mockRevenueData = [
  { name: 'Mon', revenue: 12000 },
  { name: 'Tue', revenue: 15000 },
  { name: 'Wed', revenue: 14000 },
  { name: 'Thu', revenue: 18000 },
  { name: 'Fri', revenue: 24000 },
  { name: 'Sat', revenue: 32000 },
  { name: 'Sun', revenue: 28000 },
];

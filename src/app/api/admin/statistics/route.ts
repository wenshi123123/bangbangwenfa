// GET /api/admin/statistics - 兼容旧入口，直接复用 /api/admin/stats，避免云托管内部地址重定向
export { GET } from '../stats/route';

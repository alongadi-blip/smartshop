import axios from 'axios';

const API = axios.create({
  baseURL: 'https://138-2-162-153.sslip.io/api',
  withCredentials: true
});

export const register = (email, password) => API.post('/auth/register', { email, password });
export const login = (email, password) => {
  const form = new FormData();
  form.append('username', email);
  form.append('password', password);
  return API.post('/auth/login', form);
};
export const logout = () => API.post('/auth/logout');
export const getMe = () => API.get('/auth/me');
export const getVouchers = () => API.get('/vouchers/all');
export const createVoucher = (data) => API.post('/vouchers/', data);
export const updateBalance = (id, balance) => API.patch(`/vouchers/${id}/balance`, { balance });
export const updateVoucher = (id, data) => API.patch(`/vouchers/${id}`, data);
export const uploadImage = (formData) => API.post('/vouchers/upload-image', formData);
export const deleteVoucher = (id) => API.delete(`/vouchers/${id}`);
export const getBrands = () => API.get('/brands/');
export const searchStores = (q) => API.get(`/brands/search?q=${q}`);

// Groups
export const getGroups = () => API.get('/groups/');
export const createGroup = (name) => API.post('/groups/', { name });
export const getGroup = (id) => API.get(`/groups/${id}`);
export const deleteGroup = (id) => API.delete(`/groups/${id}`);
export const createInvite = (groupId) => API.post(`/groups/${groupId}/invite`);
export const previewInvite = (code) => API.get(`/groups/invites/${code}`);
export const joinGroup = (code) => API.post(`/groups/invites/${code}/join`);
export const getGroupVouchers = (groupId) => API.get(`/groups/${groupId}/vouchers`);
export const createGroupVoucher = (groupId, data) => API.post(`/groups/${groupId}/vouchers`, data);
export const removeMember = (groupId, userId) => API.delete(`/groups/${groupId}/members/${userId}`);
export const assignVoucherToGroup = (voucherId, groupId) => API.post(`/groups/${groupId}/vouchers`, { voucher_id: voucherId });

// 2FA / TOTP
export const totpSetup = () => API.post('/auth/totp/setup');
export const totpEnable = (code) => API.post('/auth/totp/enable', { code });
export const totpDisable = (code) => API.post('/auth/totp/disable', { code });
export const totpVerifyLogin = (temp_token, code) => API.post('/auth/totp/verify-login', { temp_token, code });
export const totpStatus = () => API.get('/auth/totp/status');


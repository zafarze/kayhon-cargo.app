import { api } from './index';
import { IProhibitedItem } from '../types';

export const getProhibitedItems = async (): Promise<IProhibitedItem[]> => {
	const res = await api.get('/api/prohibited/');
	return res.data.results || res.data;
};

export const createProhibitedItem = async (keyword: string): Promise<IProhibitedItem> => {
	const res = await api.post('/api/prohibited/', { keyword });
	return res.data;
};

export const updateProhibitedItem = async (id: number, keyword: string): Promise<IProhibitedItem> => {
	const res = await api.put(`/api/prohibited/${id}/`, { keyword });
	return res.data;
};

export const deleteProhibitedItem = async (id: number): Promise<void> => {
	await api.delete(`/api/prohibited/${id}/`);
};

export const checkItemAI = async (itemName: string): Promise<{ is_prohibited: boolean, explanation: string }> => {
	const res = await api.post('/api/prohibited/check-ai/', { item_name: itemName });
	return res.data;
};

export interface IDeclaration {
	original_name: string;
	display_name: string;
	count: number;
}

export const getAllowedDeclarations = async (): Promise<IDeclaration[]> => {
	const res = await api.get('/api/prohibited/declarations/');
	return res.data.declarations;
};

export const updateDeclaration = async (originalName: string, displayName: string): Promise<void> => {
	await api.put('/api/prohibited/declarations/', {
		original_name: originalName,
		display_name: displayName
	});
};

export const deleteDeclaration = async (originalName: string): Promise<void> => {
	await api.delete('/api/prohibited/declarations/', {
		data: { original_name: originalName }
	});
};

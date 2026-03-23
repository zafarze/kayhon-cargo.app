import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Trash2, Edit2, Check, X, Search, Sparkles, FileText } from 'lucide-react';
import { IProhibitedItem } from '../../types';
import { getProhibitedItems, createProhibitedItem, updateProhibitedItem, deleteProhibitedItem, checkItemAI, getAllowedDeclarations, IDeclaration, updateDeclaration, deleteDeclaration } from '../../api/prohibited';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { customConfirm, customAlert } from '../../utils/customConfirm';

const ProhibitedItemsPage = () => {
	const [activeTab, setActiveTab] = useState<'prohibited' | 'declarations'>('prohibited');

	// Prohibited Items State
	const [items, setItems] = useState<IProhibitedItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [newKeyword, setNewKeyword] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editValue, setEditValue] = useState('');

	// AI Check State
	const [aiCheckItem, setAiCheckItem] = useState('');
	const [aiLoading, setAiLoading] = useState(false);
	const [aiResult, setAiResult] = useState<{ is_prohibited: boolean; explanation: string } | null>(null);

	// Declarations State
	const [declarations, setDeclarations] = useState<IDeclaration[]>([]);
	const [declarationsLoading, setDeclarationsLoading] = useState(false);
	const [declarationsSearch, setDeclarationsSearch] = useState('');
	const [editingDecl, setEditingDecl] = useState<string | null>(null);
	const [editDeclValue, setEditDeclValue] = useState('');

	// Состояние для отображения загрузки при генерации PDF
	const [isExportingPDF, setIsExportingPDF] = useState(false);

	const handleAICheck = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!aiCheckItem.trim()) return;

		setAiLoading(true);
		setAiResult(null);

		try {
			const result = await checkItemAI(aiCheckItem.trim());
			setAiResult(result);
		} catch (error: any) {
			customAlert('Ошибка при проверке ИИ: ' + (error.response?.data?.error || error.message));
		} finally {
			setAiLoading(false);
		}
	};

	const fetchItems = async () => {
		try {
			setLoading(true);
			const data = await getProhibitedItems();
			setItems(data);
		} catch (error) {
			console.error('Failed to fetch prohibited items', error);
		} finally {
			setLoading(false);
		}
	};

	const fetchDeclarations = async () => {
		try {
			setDeclarationsLoading(true);
			const data = await getAllowedDeclarations();
			setDeclarations(data);
		} catch (error) {
			console.error('Failed to fetch declarations', error);
		} finally {
			setDeclarationsLoading(false);
		}
	};

	useEffect(() => {
		fetchItems();
	}, []);

	useEffect(() => {
		if (activeTab === 'declarations' && declarations.length === 0) {
			fetchDeclarations();
		}
	}, [activeTab, declarations.length]);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newKeyword.trim()) return;
		try {
			const newItem = await createProhibitedItem(newKeyword.trim());
			setItems([newItem, ...items]);
			setNewKeyword('');
		} catch (error: any) {
			customAlert('Ошибка: ' + (error.response?.data?.keyword?.[0] || 'Не удалось добавить слово'));
		}
	};

	const handleDelete = async (id: number) => {
		customConfirm('Удалить это слово из запрещенных?', async () => {
			try {
				await deleteProhibitedItem(id);
				setItems(items.filter(item => item.id !== id));
			} catch (error) {
				console.error('Failed to delete item', error);
			}
		});
	};

	const startEditing = (item: IProhibitedItem) => {
		setEditingId(item.id);
		setEditValue(item.keyword);
	};

	const saveEditing = async (id: number) => {
		if (!editValue.trim()) return;
		try {
			const updatedItem = await updateProhibitedItem(id, editValue.trim());
			setItems(items.map(item => item.id === id ? updatedItem : item));
			setEditingId(null);
		} catch (error: any) {
			customAlert('Ошибка: ' + (error.response?.data?.keyword?.[0] || 'Не удалось обновить слово'));
		}
	};

	const filteredItems = (Array.isArray(items) ? items : []).filter(item =>
		item.keyword.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const filteredDeclarations = (Array.isArray(declarations) ? declarations : []).filter(decl =>
		decl.display_name.toLowerCase().includes(declarationsSearch.toLowerCase()) ||
		decl.original_name.toLowerCase().includes(declarationsSearch.toLowerCase())
	);

	const handleEditDecl = (decl: IDeclaration) => {
		setEditingDecl(decl.original_name);
		setEditDeclValue(decl.display_name);
	};

	const saveEditDecl = async (originalName: string) => {
		if (!editDeclValue.trim()) return;
		try {
			await updateDeclaration(originalName, editDeclValue.trim());
			setDeclarations(declarations.map(d =>
				d.original_name === originalName ? { ...d, display_name: editDeclValue.trim() } : d
			));
			setEditingDecl(null);
		} catch (error) {
			console.error('Error saving declaration', error);
			customAlert('Ошибка при сохранении');
		}
	};

	const handleDeleteDecl = async (originalName: string) => {
		customConfirm('Удалить эту декларацию из списка? Она будет скрыта, но данные посылок не изменятся.', async () => {
			try {
				await deleteDeclaration(originalName);
				setDeclarations(declarations.filter(d => d.original_name !== originalName));
			} catch (error) {
				console.error('Error deleting declaration', error);
				customAlert('Ошибка при удалении');
			}
		});
	};

	// Обновленная функция экспорта в PDF с поддержкой кириллицы
	const exportToPDF = async () => {
		try {
			setIsExportingPDF(true);
			const doc = new jsPDF();

			// 1. Загружаем шрифт из локальной папки public/static/
			const fontUrl = '/static/Roboto-Regular.ttf';
			const response = await fetch(fontUrl);

			if (!response.ok) {
				throw new Error('Не удалось загрузить файл шрифта');
			}

			const fontBuffer = await response.arrayBuffer();

			// 2. Преобразуем шрифт в Base64
			let binary = '';
			const bytes = new Uint8Array(fontBuffer);
			for (let i = 0; i < bytes.byteLength; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			const fontBase64 = window.btoa(binary);

			// 3. Регистрируем шрифт в jsPDF
			doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
			doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

			// 4. Устанавливаем шрифт по умолчанию для заголовка
			doc.setFont('Roboto');
			doc.text('Список деклараций', 14, 15);

			// 5. Рисуем таблицу, явно указывая шрифт для заголовков
			autoTable(doc, {
				styles: { font: 'Roboto' },
				headStyles: {
					font: 'Roboto',
					fontStyle: 'normal' // ВАЖНО: отключаем жирность, чтобы не слетал шрифт
				},
				head: [['#', 'Оригинальное название', 'Отображаемое название', 'Кол-во товаров']],
				body: filteredDeclarations.map((d, index) => [
					index + 1,
					d.original_name,
					d.display_name,
					d.count
				]),
				startY: 20
			});

			doc.save('declarations.pdf');
		} catch (error) {
			console.error('Ошибка при генерации PDF:', error);
			customAlert('Ошибка при создании PDF. Проверьте, лежит ли шрифт по пути frontend/public/static/Roboto-Regular.ttf');
		} finally {
			setIsExportingPDF(false);
		}
	};

	const exportToExcel = () => {
		const data = filteredDeclarations.map((d, index) => ({
			'#': index + 1,
			'Оригинальное название': d.original_name,
			'Отображаемое название': d.display_name,
			'Количество товаров': d.count
		}));
		const ws = XLSX.utils.json_to_sheet(data);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Декларации');
		XLSX.writeFile(wb, 'declarations.xlsx');
	};

	return (
		<div className="p-4 md:p-8 max-w-4xl mx-auto">
			<div className="flex items-center gap-3 mb-6">
				<div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
					{activeTab === 'prohibited' ? <ShieldAlert size={28} /> : <FileText size={28} />}
				</div>
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Каталог товаров</h1>
					<p className="text-gray-500 text-sm">Управление декларациями и запрещенными товарами</p>
				</div>
			</div>

			<div className="flex bg-gray-100 p-1 rounded-xl mb-6">
				<button
					onClick={() => setActiveTab('declarations')}
					className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'declarations' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
						}`}
				>
					Список деклараций
				</button>
				<button
					onClick={() => setActiveTab('prohibited')}
					className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'prohibited' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
						}`}
				>
					Запрещенные товары
				</button>
			</div>

			{activeTab === 'declarations' ? (
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
					<div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<div>
							<h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
								<Check size={18} className="text-green-600" />
								Разрешенные товары (из базы данных)
							</h3>
							<p className="text-sm text-gray-600">
								Этот список сформирован на основе ваших существующих посылок. Все запрещенные товары отфильтрованы.
							</p>
						</div>
						<div className="flex items-center gap-2 shrink-0">
							<button
								onClick={exportToPDF}
								disabled={isExportingPDF}
								className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors border border-red-200"
							>
								{isExportingPDF ? 'Создание PDF...' : 'Экспорт в PDF'}
							</button>
							<button onClick={exportToExcel} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors border border-green-200">
								Экспорт в Excel
							</button>
						</div>
					</div>

					<div className="p-4 bg-gray-50 border-b border-gray-100">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
							<input
								type="text"
								value={declarationsSearch}
								onChange={e => setDeclarationsSearch(e.target.value)}
								placeholder="Поиск по декларациям..."
								className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
							/>
						</div>
					</div>

					<div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
						{declarationsLoading ? (
							<div className="p-8 text-center text-gray-500">Анализ базы данных и загрузка...</div>
						) : filteredDeclarations.length === 0 ? (
							<div className="p-8 text-center text-gray-500">
								{declarationsSearch ? 'Ничего не найдено' : 'Список деклараций пуст'}
							</div>
						) : (
							filteredDeclarations.map((decl, index) => (
								<div key={decl.original_name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-gray-50 transition-colors gap-3">
									<div className="flex-1 font-medium text-gray-900 flex items-center gap-3 w-full sm:w-auto">
										<div className="w-8 h-8 shrink-0 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
											{index + 1}
										</div>
										{editingDecl === decl.original_name ? (
											<div className="flex-1 flex items-center gap-2 mr-4">
												<input
													type="text"
													value={editDeclValue}
													onChange={e => setEditDeclValue(e.target.value)}
													className="flex-1 px-3 py-1.5 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
													autoFocus
													onKeyDown={e => e.key === 'Enter' && saveEditDecl(decl.original_name)}
												/>
											</div>
										) : (
											<div className="flex flex-col">
												<span>{decl.display_name}</span>
												{decl.original_name !== decl.display_name && (
													<span className="text-xs text-gray-400">Оригинал: {decl.original_name}</span>
												)}
											</div>
										)}
									</div>
									<div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 ml-11 sm:ml-0">
										<div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg shrink-0">
											Кол-во: <span className="font-bold">{decl.count}</span>
										</div>
										<div className="text-sm text-green-600 font-medium px-3 py-1 bg-green-50 rounded-full hidden sm:block">
											Разрешено
										</div>

										<div className="flex items-center gap-1">
											{editingDecl === decl.original_name ? (
												<>
													<button onClick={() => saveEditDecl(decl.original_name)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Сохранить">
														<Check size={18} />
													</button>
													<button onClick={() => setEditingDecl(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Отмена">
														<X size={18} />
													</button>
												</>
											) : (
												<>
													<button onClick={() => handleEditDecl(decl)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Редактировать">
														<Edit2 size={16} />
													</button>
													<button onClick={() => handleDeleteDecl(decl.original_name)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Удалить">
														<Trash2 size={16} />
													</button>
												</>
											)}
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			) : (
				<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
					{/* Блок проверки ИИ */}
					<div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
						<h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
							<Sparkles size={18} className="text-blue-600" />
							Проверка товара через ИИ (Gemini)
						</h3>
						<form onSubmit={handleAICheck} className="flex gap-2 mb-4">
							<input
								type="text"
								value={aiCheckItem}
								onChange={e => setAiCheckItem(e.target.value)}
								placeholder="Введите название лекарства или товара..."
								className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<button
								type="submit"
								disabled={aiLoading || !aiCheckItem.trim()}
								className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
							>
								{aiLoading ? 'Проверка...' : 'Проверить ИИ'}
							</button>
						</form>

						{aiResult && (
							<div className={`p-4 rounded-xl border ${aiResult.is_prohibited ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
								<div className="flex items-start gap-3">
									{aiResult.is_prohibited ? (
										<ShieldAlert className="text-red-500 mt-1" size={24} />
									) : (
										<Check className="text-green-500 mt-1" size={24} />
									)}
									<div>
										<h4 className={`font-bold text-lg mb-1 ${aiResult.is_prohibited ? 'text-red-700' : 'text-green-700'}`}>
											{aiResult.is_prohibited ? 'ЗАПРЕЩЕНО' : 'РАЗРЕШЕНО'}
										</h4>
										<p className="text-gray-700">{aiResult.explanation}</p>
									</div>
								</div>
							</div>
						)}
					</div>

					<div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-4">
						<form onSubmit={handleCreate} className="flex-1 flex gap-2">
							<input
								type="text"
								value={newKeyword}
								onChange={e => setNewKeyword(e.target.value)}
								placeholder="Добавить новое слово (напр. 'оружие')"
								className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
							/>
							<button
								type="submit"
								disabled={!newKeyword.trim()}
								className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<Plus size={20} />
								<span className="hidden sm:inline">Добавить</span>
							</button>
						</form>

						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
							<input
								type="text"
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								placeholder="Поиск по списку..."
								className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
							/>
						</div>
					</div>

					<div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
						{loading ? (
							<div className="p-8 text-center text-gray-500">Загрузка...</div>
						) : filteredItems.length === 0 ? (
							<div className="p-8 text-center text-gray-500">
								{searchQuery ? 'Ничего не найдено' : 'Список запрещенных товаров пуст'}
							</div>
						) : (
							filteredItems.map(item => (
								<div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
									{editingId === item.id ? (
										<div className="flex-1 flex items-center gap-2 mr-4">
											<input
												type="text"
												value={editValue}
												onChange={e => setEditValue(e.target.value)}
												className="flex-1 px-3 py-1.5 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
												autoFocus
												onKeyDown={e => e.key === 'Enter' && saveEditing(item.id)}
											/>
										</div>
									) : (
										<div className="flex-1 font-medium text-gray-900">
											{item.keyword}
										</div>
									)}

									<div className="flex items-center gap-2">
										{editingId === item.id ? (
											<>
												<button onClick={() => saveEditing(item.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Сохранить">
													<Check size={20} />
												</button>
												<button onClick={() => setEditingId(null)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Отмена">
													<X size={20} />
												</button>
											</>
										) : (
											<>
												<button onClick={() => startEditing(item)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Редактировать">
													<Edit2 size={18} />
												</button>
												<button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Удалить">
													<Trash2 size={18} />
												</button>
											</>
										)}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default ProhibitedItemsPage;
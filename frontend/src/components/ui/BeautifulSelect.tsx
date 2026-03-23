import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
	value: string;
	label: string | React.ReactNode;
	icon?: React.ReactNode;
	colorClass?: string;
}

interface BeautifulSelectProps {
	value: string;
	onChange: (value: string) => void;
	options: Option[];
	placeholder?: string;
	className?: string;
}

export const BeautifulSelect: React.FC<BeautifulSelectProps> = ({ value, onChange, options, placeholder = "Выберите...", className = "" }) => {
	const [isOpen, setIsOpen] = useState(false);
	const selectRef = useRef<HTMLDivElement>(null);

	const selectedOption = options.find(opt => opt.value === value);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	return (
		<div className={`relative ${className}`} ref={selectRef}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className={`w-full flex items-center justify-between bg-gray-50 border transition-all rounded-xl px-4 py-3 font-bold text-left outline-none ${isOpen ? 'border-blue-300 ring-2 ring-blue-100 bg-white' : 'border-gray-100 hover:border-gray-200'} ${selectedOption?.colorClass || 'text-gray-800'}`}
			>
				<div className="flex items-center gap-2 truncate">
					{selectedOption?.icon}
					<span className="truncate">{selectedOption ? selectedOption.label : <span className="text-gray-400 font-medium">{placeholder}</span>}</span>
				</div>
				<ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -10, scale: 0.98 }}
						transition={{ duration: 0.15 }}
						className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-2xl shadow-blue-900/10 rounded-2xl overflow-hidden z-50 p-1"
					>
						<div className="max-h-60 overflow-y-auto custom-scrollbar">
							{options.map((opt) => {
								const isSelected = opt.value === value;
								return (
									<button
										key={opt.value}
										type="button"
										onClick={() => {
											onChange(opt.value);
											setIsOpen(false);
										}}
										className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors text-left font-bold text-sm ${isSelected ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'}`}
									>
										<div className={`flex items-center gap-2 truncate ${opt.colorClass || ''}`}>
											{opt.icon}
											<span className="truncate">{opt.label}</span>
										</div>
										{isSelected && <Check size={16} className="text-blue-600 shrink-0" />}
									</button>
								);
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

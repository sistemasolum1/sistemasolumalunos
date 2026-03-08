import React, { useState, useEffect } from 'react';
import {
    ChevronRight,
    ChevronLeft,
    Plus,
    Trash2,
    DollarSign,
    Save,
    ShoppingBag,
    Home,
    Car,
    HeartPulse,
    GraduationCap,
    Smile,
    Shirt,
    Gamepad2,
    Tv,
    Gift,
    HandHeart,
    Briefcase,
    Dog,
    CreditCard,
    MoreHorizontal,
    ArrowLeft,
    CheckCircle2,
    Pencil,
    X,
    Printer,
    RefreshCw
} from 'lucide-react';
import { CostOfLivingItem } from '../types';
import { authService } from '../services/authService';
import { PrintPortal } from './PrintPortal';
import { PrintHeader } from './Mentorship/Meeting1/PrintHeader';

interface CostOfLivingProps {
    userId: string;
    onClose?: () => void;
    onComplete: () => void;
    user?: {
        name: string;
        email: string;
        whatsapp: string;
    };
    initialView?: 'wizard' | 'summary';
    onFetch?: (userId: string) => Promise<CostOfLivingItem[]>;
    onSave?: (userId: string, item: any) => Promise<void>;
    onDelete?: (itemId: string) => Promise<void>;
}

export const CATEGORIES = [
    { id: 'Alimentação', icon: ShoppingBag, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', examples: 'Ex: Supermercado, feira, padaria, restaurantes, delivery, açougue, cafeteria, bebidas e outros...' },
    { id: 'Moradia', icon: Home, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', examples: 'Ex: Aluguel ou financiamento, condomínio, luz, água, internet, gás, manutenção, IPTU, diarista e outros...' },
    { id: 'Transporte', icon: Car, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', examples: 'Ex: Combustível, Uber/99, ônibus, metrô, estacionamento, seguro, IPVA, manutenção do carro, pedágio, lavação e outros...' },
    { id: 'Saúde', icon: HeartPulse, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', examples: 'Ex: Farmácia, plano de saúde, consultas, exames, dentista, terapia, academia, suplementação e outros...' },
    { id: 'Educação', icon: GraduationCap, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', examples: 'Ex: Escola, faculdade, cursos, material escolar, livros, consultoria, treinamentos, uniformes e outros...' },
    { id: 'Cuidados Pessoais', icon: Smile, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', examples: 'Ex: Salão de beleza, barbearia, cosméticos, higiene, manicure, maquiagem, skincare, estética e outros...' },
    { id: 'Roupas', icon: Shirt, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', examples: 'Ex: Vestuário, calçados, acessórios, lavanderia, costureira, jóias e outros...' },
    { id: 'Lazer e Hobbies', icon: Gamepad2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', examples: 'Ex: Cinema, shows, passeios, viagens, jogos, materiais para prática de hobbies e outros...' },
    { id: 'Assinaturas', icon: Tv, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', examples: 'Ex: Streaming (Netflix, Spotify, Amazon Prime, Disney+...), revistas, armazenamento em núvem, aplicativos, plataformas de ensino, Clube de assinatura, TV a cabo e outros...' },
    { id: 'Presentes e datas comemorativas', icon: Gift, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', examples: 'Ex: Aniversários, casamentos, natal, páscoa, dia dos namorados, formaturas, mimos e outros...' },
    { id: 'Ajuda ao próximo', icon: HandHeart, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', examples: 'Ex: Doações, dízimo, ofertas, entidades de caridade, ajuda para familiares ou amigos e outros...' },
    { id: 'Trabalho', icon: Briefcase, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', examples: 'Ex: Ferramentas, equipamentos, cursos profissionais, materiais de escritório, Softwares, taxas, networking e outros...' },
    { id: 'Animal de Estimação', icon: Dog, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', examples: 'Ex: Ração, veterinário, banho e tosa, vacinas, brinquedos, medicamentos, petshop e outros...' },
    { id: 'Taxas', icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', examples: 'Ex: Taxas bancárias, anuidade de cartão, manutenção de conta, juros de cheque especial, tarifas diversas e outros...' },
    { id: 'Outros', icon: MoreHorizontal, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', examples: 'Todos os gastos que não se encaixarem em nenhuma das categorias anteriores, ou que você não souber o que foi comprado.' }
];

export const CostOfLiving: React.FC<CostOfLivingProps> = ({
    userId,
    onClose,
    onComplete,
    isStandalone = false,
    user,
    initialView = 'wizard',
    onFetch,
    onSave,
    onDelete
}) => {
    const [step, setStep] = useState(initialView === 'summary' ? 15 : -1); // -1 = Grid View, 15 = Summary
    const [items, setItems] = useState<CostOfLivingItem[]>([]);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Form Input State
    const [description, setDescription] = useState('');
    const [value, setValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    // Installment State
    const [isInstallment, setIsInstallment] = useState(false);
    const [installmentsCount, setInstallmentsCount] = useState('1');

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = onFetch
                ? await onFetch(userId)
                : await authService.getCostOfLiving(userId);
            setItems(data);
        } catch (error) {
            console.error(error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const isGrid = step === -1;
    const isSummary = step === CATEGORIES.length;
    const currentCategory = !isGrid && !isSummary ? CATEGORIES[step] : null;

    const filteredItems = items.filter(item => currentCategory ? item.category === currentCategory.id : false);
    const categoryTotal = filteredItems.reduce((acc, curr) => acc + curr.value, 0);
    const grandTotal = items.reduce((acc, curr) => acc + curr.value, 0);

    const handleAddItem = async () => {
        if (!description || !value) return;
        setIsSubmitting(true);

        const newItem = {
            id: editingItemId || undefined,
            category: currentCategory!.id,
            description,
            value: parseFloat(value.replace(',', '.')),
            is_installment: isInstallment,
            installments_count: isInstallment ? parseInt(installmentsCount) : 1
        };

        try {
            if (onSave) {
                await onSave(userId, newItem);
            } else {
                await authService.saveCostOfLiving(userId, newItem);
            }
            await loadData(); // Reload to get ID and ensure sync
            setDescription('');
            setValue('');
            setIsInstallment(false);
            setInstallmentsCount('1');
            setEditingItemId(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteItem = async (id: string) => {
        try {
            if (onDelete) {
                await onDelete(id);
            } else {
                await authService.deleteCostOfLivingItem(id);
            }
            setItems(items.filter(i => i.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditItem = (item: CostOfLivingItem) => {
        setDescription(item.description);
        setValue(item.value.toString().replace('.', ','));
        setIsInstallment(item.is_installment || false);
        setInstallmentsCount(item.installments_count?.toString() || '1');
        setEditingItemId(item.id);
    };

    const handleCancelEdit = () => {
        setDescription('');
        setValue('');
        setIsInstallment(false);
        setInstallmentsCount('1');
        setEditingItemId(null);
    };

    const handleNext = () => {
        if (step < CATEGORIES.length) {
            setStep(step + 1);
        } else {
            onComplete();
        }
    };

    const handleBack = () => {
        if (isGrid) {
            if (onClose) onClose();
            return;
        }

        if (isSummary) {
            setStep(-1); // Back to Grid
            return;
        }

        // If in category view, go back to grid
        setStep(-1);
    };

    const jumpToCategory = (index: number) => {
        setStep(index);
    };

    const toggleCategory = (categoryId: string) => {
        if (expandedCategory === categoryId) {
            setExpandedCategory(null);
        } else {
            setExpandedCategory(categoryId);
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 300);
    };

    const wrapperClasses = isStandalone
        ? "min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-0 md:p-6"
        : "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4";

    const containerClasses = isStandalone
        ? "w-full max-w-4xl mx-auto bg-slate-900 shadow-2xl overflow-hidden flex flex-col h-full md:h-auto md:min-h-[80vh] md:rounded-3xl border border-slate-800"
        : "bg-slate-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-800 flex flex-col";

    if (loading) {
        return (
            <div className={wrapperClasses}>
                <div className="text-white animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p>Carregando Custo de Vida...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={wrapperClasses}>
            <div className={containerClasses}>

                {/* Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                <DollarSign className="text-emerald-500" size={24} />
                                Custo de Vida
                            </h2>
                            <p className="text-[10px] text-slate-400 font-medium py-1">
                                Referente ao mês anterior (dia primeiro ao último dia do mês)
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium py-1">
                                Lançar com base no extrato bancário e faturas de cartão de crédito
                            </p>
                            <span className="text-xs text-slate-500 font-bold uppercase">
                                {isGrid ? 'Visão Geral' : (isSummary ? 'Resumo Final' : `Categoria ${step + 1} de ${CATEGORIES.length}`)}
                            </span>
                        </div>
                    </div>
                    {!isGrid && !isSummary && currentCategory && (
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Categoria</span>
                            <span className={`text-lg font-black ${currentCategory.color}`}>
                                {categoryTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    )}
                    {isSummary && (
                        <button
                            onClick={handlePrint}
                            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                            title="Imprimir Relatório"
                        >
                            <Printer size={20} />
                            <span className="text-xs font-bold uppercase hidden sm:inline">Imprimir</span>
                        </button>
                    )}
                </div>

                {/* Progress Bar (Only visible in Wizard Mode - optional, maybe remove for Grid?) */}
                {!isGrid && (
                    <div className="w-full bg-slate-800 h-1">
                        <div
                            className="bg-emerald-500 h-1 transition-all duration-300 ease-out"
                            style={{ width: `${((step + 1) / (CATEGORIES.length + 1)) * 100}%` }}
                        ></div>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {isGrid ? (
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-black text-white uppercase mb-2">Categorias de Despesas</h3>
                                <p className="text-slate-400 text-sm">Selecione uma categoria para adicionar seus gastos.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {CATEGORIES.map((cat, index) => {
                                    const catTotal = items.filter(i => i.category === cat.id).reduce((acc, curr) => acc + curr.value, 0);
                                    const hasItems = catTotal > 0;
                                    const Icon = cat.icon;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setStep(index)}
                                            className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-start gap-3 hover:scale-[1.02] active:scale-[0.98] text-left
                                                ${hasItems
                                                    ? `bg-slate-800 border-slate-700 hover:border-emerald-500/50`
                                                    : `bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700`
                                                }
                                            `}
                                        >
                                            <div className="flex justify-between items-start w-full">
                                                <div className={`p-3 rounded-xl ${cat.bg} ${cat.color}`}>
                                                    <Icon size={20} />
                                                </div>
                                                {hasItems && (
                                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-500/20">
                                                        PREENCHIDO
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm uppercase">{cat.id}</h4>
                                                {hasItems ? (
                                                    <p className="text-emerald-400 font-bold text-lg">
                                                        {catTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </p>
                                                ) : (
                                                    <p className="text-slate-600 text-xs mt-1">Clique para adicionar</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-8 flex justify-center">
                                <div className="bg-slate-800 rounded-2xl p-6 text-center border border-slate-700 max-w-sm w-full">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Estimado</p>
                                    <p className="text-3xl font-black text-white mb-4">
                                        {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                    <button
                                        onClick={() => setStep(CATEGORIES.length)}
                                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 size={16} /> Concluir e Ver Resumo
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : isSummary ? (
                        <div className="space-y-6">
                            <div className="bg-emerald-500/10 rounded-2xl p-8 text-center border border-emerald-500/20">
                                <h3 className="text-lg font-bold text-emerald-400 uppercase mb-2">Custo de Vida Total</h3>
                                <p className="text-4xl font-black text-white mb-4">
                                    {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                                    Este é o valor estimado para manter o seu estilo de vida ideal com base nas categorias preenchidas.
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">
                                    Clique nas categorias abaixo para editar
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {CATEGORIES.map((cat, index) => {
                                    const total = items.filter(i => i.category === cat.id).reduce((acc, curr) => acc + curr.value, 0);
                                    if (total === 0) return null;
                                    const Icon = cat.icon;
                                    const isExpanded = expandedCategory === cat.id;
                                    const catItems = items.filter(i => i.category === cat.id);

                                    return (
                                        <div key={cat.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden transition-all duration-300">
                                            <div
                                                onClick={() => toggleCategory(cat.id)}
                                                className={`p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors ${isExpanded ? 'bg-slate-800' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${cat.bg} ${cat.color}`}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <span className={`font-bold text-sm ${isExpanded ? 'text-white' : 'text-slate-300'}`}>{cat.id}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-white text-sm">
                                                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                jumpToCategory(index);
                                                            }}
                                                            className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-emerald-400 transition-colors"
                                                            title="Editar Categoria"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Items List */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-700/50 bg-slate-900/50">
                                                    {catItems.map(item => (
                                                        <div key={item.id} className="px-4 py-3 flex justify-between items-center border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                                                            <span className="text-sm text-slate-300 pl-12">{item.description}</span>
                                                            <span className="text-sm font-bold text-slate-400">
                                                                {item.is_installment && <span className="text-[10px] text-slate-500 mr-2 font-normal uppercase tracking-widest">{item.installments_count}x</span>}
                                                                {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto">
                            {/* Minicards Navigation */}
                            <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide snap-x">
                                {CATEGORIES.map((cat, index) => {
                                    const isActive = step === index;
                                    const catTotal = items.filter(i => i.category === cat.id).reduce((acc, curr) => acc + curr.value, 0);
                                    const hasItems = catTotal > 0;
                                    const Icon = cat.icon;

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setStep(index)}
                                            className={`
                                                flex flex-col items-center justify-center p-3 rounded-xl min-w-[80px] border transition-all duration-300 snap-start
                                                ${isActive
                                                    ? `bg-slate-800 border-sky-500/50 shadow-lg shadow-sky-500/10 scale-105`
                                                    : `bg-slate-900 border-slate-800 opacity-60 hover:opacity-100 hover:bg-slate-800`
                                                }
                                            `}
                                        >
                                            <div className={`p-1.5 rounded-lg mb-1 ${isActive ? cat.bg : 'bg-slate-800'} ${cat.color}`}>
                                                <Icon size={16} />
                                            </div>
                                            <span className={`text-[9px] font-bold uppercase truncate max-w-full ${isActive ? 'text-white' : 'text-slate-500'}`}>
                                                {cat.id.split(' ')[0]}
                                            </span>
                                            {hasItems && (
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Category Header */}
                            <div className={`flex items-center gap-4 mb-8 p-4 rounded-2xl ${currentCategory.bg} ${currentCategory.border} border`}>
                                <div className={`p-3 rounded-xl bg-slate-900 ${currentCategory.color}`}>
                                    <currentCategory.icon size={32} />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black uppercase ${currentCategory.color}`}>{currentCategory.id}</h3>
                                    <p className="text-slate-400 text-xs">{currentCategory.examples}</p>
                                </div>
                            </div>

                            {/* Input Form */}
                            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl mb-8">
                                {/* Installment Selection Row */}
                                <div className="mb-6 flex flex-wrap items-center gap-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compra Parcelada?</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsInstallment(false)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!isInstallment ? 'bg-slate-700 text-white border-sky-500/50' : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-800'} border`}
                                        >
                                            Não
                                        </button>
                                        <button
                                            onClick={() => setIsInstallment(true)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isInstallment ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-slate-900 text-slate-500 border-transparent hover:bg-slate-800'} border`}
                                        >
                                            Sim
                                        </button>
                                    </div>

                                    {isInstallment && (
                                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <span className="text-xs font-bold text-slate-500 uppercase">Em quantas x?</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={installmentsCount}
                                                onChange={(e) => setInstallmentsCount(e.target.value)}
                                                className="w-20 bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-sky-500 transition-colors"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição</label>
                                        <input
                                            type="text"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                            placeholder="Com o que gastou?"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Valor (Parcela)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-slate-500 text-xs font-bold">R$</span>
                                            <input
                                                type="text"
                                                value={value}
                                                onChange={(e) => setValue(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                                placeholder="0,00"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {isInstallment && (
                                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resumo do Parcelamento</span>
                                            <span className="text-xs font-medium text-slate-300">{installmentsCount}x de R$ {value || '0,00'}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">Valor Total</span>
                                            <span className="text-lg font-black text-white">
                                                R$ {(parseFloat((value || '0').replace(',', '.')) * (parseInt(installmentsCount) || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={handleAddItem}
                                        disabled={!description || !value || isSubmitting}
                                        className={`flex-1 py-3 ${editingItemId ? 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/20' : 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'} disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-black text-xs uppercase shadow-lg transition-all flex items-center justify-center gap-2`}
                                    >
                                        {isSubmitting ? 'Salvando...' : (editingItemId ? <><Save size={16} /> Atualizar Item</> : <><Plus size={16} /> Adicionar Item</>)}
                                    </button>
                                    {editingItemId && (
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* List of Items */}
                            {filteredItems.length > 0 ? (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Itens Adicionados</h4>
                                    {filteredItems.map(item => (
                                        <div key={item.id} className="bg-slate-800/50 p-4 rounded-xl flex justify-between items-center group border border-slate-700/30 hover:border-slate-600 transition-colors">
                                            <span className="font-medium text-slate-200">{item.description}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-emerald-400">
                                                    {item.is_installment && (
                                                        <span className="text-[10px] text-slate-500 mr-2 font-normal uppercase tracking-widest">
                                                            {item.installments_count}x de
                                                        </span>
                                                    )}
                                                    {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEditItem(item)}
                                                        className="p-1.5 hover:bg-sky-500/20 text-slate-500 hover:text-sky-400 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-500 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-600">
                                    <p className="text-sm">Nenhum item adicionado nesta categoria.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer - Only show if NOT in Grid View */}
                {!isGrid && (
                    <div className="p-6 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-10 flex justify-between items-center">
                        {isSummary ? (
                            <div></div>
                        ) : (
                            <button
                                onClick={handleBack}
                                className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
                            >
                                <ChevronLeft size={16} /> Voltar
                            </button>
                        )}
                        {!isSummary ? (
                            <button
                                onClick={() => setStep(CATEGORIES.length)}
                                className="px-8 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Concluir
                            </button>
                        ) : (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setStep(-1)}
                                    className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2"
                                >
                                    <RefreshCw size={16} /> Atualizar / Editar
                                </button>
                                <button
                                    onClick={onComplete}
                                    className="px-8 py-3 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                >
                                    <CheckCircle2 size={16} /> Finalizar
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Print Layout via Portal */}
            {isPrinting && (
                <PrintPortal>
                    <div className="p-8 bg-white text-black">
                        <PrintHeader user={user || { name: 'Cliente', email: '', id: '', role: 'USER' }} title="Relatório de Custo de Vida" />

                        <div className="mt-8">
                            <div className="flex justify-end mb-8 border-b border-slate-200 pb-4">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-500 uppercase">Custo Total Mensal</p>
                                    <p className="text-4xl font-black text-black">
                                        {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="space-y-8">
                                {CATEGORIES.map(cat => {
                                    const catItems = items.filter(i => i.category === cat.id);
                                    if (catItems.length === 0) return null;
                                    const catTotal = catItems.reduce((acc, curr) => acc + curr.value, 0);

                                    return (
                                        <div key={cat.id} className="break-inside-avoid">
                                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                                                <h3 className="text-lg font-black uppercase flex items-center gap-2 text-black">
                                                    <span className="text-slate-400 text-sm">■ </span>
                                                    {cat.id}
                                                </h3>
                                                <span className="font-bold text-lg text-black">
                                                    {catTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </div>
                                            <div className="overflow-x-auto w-full">
                                                <table className="w-full min-w-[600px] text-sm">
                                                    <thead>
                                                        <tr className="text-left text-slate-500 text-xs uppercase">
                                                            <th className="pb-2 font-bold w-3/4">Descrição</th>
                                                            <th className="pb-2 font-bold text-right">Valor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-black">
                                                        {catItems.map(item => (
                                                            <tr key={item.id} className="border-b border-slate-100">
                                                                <td className="py-2">{item.description}</td>
                                                                <td className="py-2 text-right font-medium">
                                                                    {item.is_installment ? (
                                                                        <div className="flex flex-col items-end">
                                                                            <span>{item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-[10px] text-slate-400 uppercase">({item.installments_count}x)</span></span>
                                                                            <span className="text-[10px] text-slate-400 uppercase font-normal">Total: {(item.value * (item.installments_count || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                                        </div>
                                                                    ) : (
                                                                        item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Note */}
                            <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
                                <p>Relatório gerado automaticamente pelo sistema de Diagnóstico Financeiro.</p>
                            </div>
                        </div>
                    </div>
                </PrintPortal>
            )}
        </div>
    );
};

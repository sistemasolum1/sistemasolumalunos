
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus, ChecklistData, FinancialData, ConsultoriaBilling } from '../types';
import { authService } from '../services/authService';
import { UserIntakeModal } from './UserIntakeModal';
import { X, Search, Trash2, Eye, Shield, User as UserIcon, Lock, Briefcase, Plus, Check, Clock, AlertCircle, MessageCircle, Edit2, LogOut, CheckCircle2, FileText, ShieldCheck, ListChecks, Target, CreditCard, DollarSign, ArrowRight } from 'lucide-react';
import { ChecklistModal } from './ChecklistModal';

interface AdminDashboardProps {
    currentUser: User;
    onClose: () => void;
    onSelectUser: (userId: string) => void;
    onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onClose, onSelectUser, onLogout }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [activeTab, setActiveTab] = useState<'users' | 'faturamento' | 'visao-geral'>('users');
    const [billingSubTab, setBillingSubTab] = useState<'consultoria' | 'mentoria' | 'acompanhamento'>('consultoria');

    const [consultoriaDrafts, setConsultoriaDrafts] = useState<Record<string, ConsultoriaBilling>>({});
    const [acompanhamentoDrafts, setAcompanhamentoDrafts] = useState<Record<string, (number | '')[]>>({});
    const [mentoriaDrafts, setMentoriaDrafts] = useState<Record<string, (number | '')[]>>({});

    // Modals state
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // New User Form State
    const [newUser, setNewUser] = useState({ name: '', email: '', whatsapp: '', password: '', role: 'USER' as UserRole });

    // Password field for edit (separated because User type usually doesn't show it in UI lists)
    const [editPassword, setEditPassword] = useState('');

    const [showIntakeModal, setShowIntakeModal] = useState(false);
    const [intakeUser, setIntakeUser] = useState<User | null>(null);

    const [showChecklistModal, setShowChecklistModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showPhaseModal, setShowPhaseModal] = useState(false);
    const [selectedPhaseUser, setSelectedPhaseUser] = useState<User | null>(null);
    const [selectedUserFinancialData, setSelectedUserFinancialData] = useState<FinancialData | undefined>(undefined);

    // Mentorship Subscription Modal
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [subscriptionUser, setSubscriptionUser] = useState<User | null>(null);

    const SUBSCRIPTION_PLANS = [
        { id: 'plan_200', value: 200, label: 'Plano R$ 200' },
        { id: 'plan_250', value: 250, label: 'Plano R$ 250' },
        { id: 'plan_325', value: 325, label: 'Plano R$ 325' },
    ];

    const handleConsultoriaDraftChange = <K extends keyof ConsultoriaBilling>(userId: string, field: K, value: ConsultoriaBilling[K]) => {
        setConsultoriaDrafts(prev => {
            const currentDraft = prev[userId];
            const user = users.find(u => u.id === userId);
            const currentData = user?.checklistData?.billing?.consultoria || {
                baseValue: 497,
                paymentMethod: 'a_vista',
                hasDownPayment: false,
                downPaymentValue: 147,
                part1Paid: false,
                part2Paid: false
            };

            const updatedDraft = { ...(currentDraft || currentData), [field]: value };

            // Logic rules for UI toggles
            if (field === 'paymentMethod' && value === 'a_vista') {
                updatedDraft.hasDownPayment = false;
            }

            return { ...prev, [userId]: updatedDraft };
        });
    };

    const handleConsultoriaPaymentToggle = async (userId: string, part: 1 | 2) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;

            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const existingConsultoria = currentBilling.consultoria || {
                baseValue: 497,
                paymentMethod: 'a_vista',
                hasDownPayment: false,
                downPaymentValue: 147,
                part1Paid: false,
                part2Paid: false
            };

            const updatedConsultoria = { ...existingConsultoria };
            if (part === 1) updatedConsultoria.part1Paid = !updatedConsultoria.part1Paid;
            if (part === 2) updatedConsultoria.part2Paid = !updatedConsultoria.part2Paid;

            const updatedData = { ...currentData, billing: { ...currentBilling, consultoria: updatedConsultoria } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error("Error toggling consultoria payment:", error); }
    };

    const handleConsultoriaSetupSave = async (userId: string) => {
        const draftValues = consultoriaDrafts[userId];
        if (!draftValues) return; // Nothing to save

        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            // Maintain the paid status from current data
            const existingConsultoria = currentBilling.consultoria || {
                part1Paid: false,
                part2Paid: false
            };

            const updatedConsultoria: ConsultoriaBilling = {
                ...draftValues,
                part1Paid: existingConsultoria.part1Paid || false,
                part2Paid: draftValues.paymentMethod === 'parcelado' && draftValues.hasDownPayment ? (existingConsultoria.part2Paid || false) : false
            };

            const updatedData = { ...currentData, billing: { ...currentBilling, consultoria: updatedConsultoria } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));

            // clear draft after saving
            setConsultoriaDrafts(prev => {
                const newDrafts = { ...prev };
                delete newDrafts[userId];
                return newDrafts;
            });

        } catch (error) { console.error(error); }
    };

    const handleMentoriaPaymentToggle = async (userId: string, monthIndex: number) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const existingMentoria = currentBilling.mentoria || { payments: Array(6).fill(false) }; // Start with 6 months

            const planId = user.checklistData?.subscriptionPlanId;
            const defaultPlanValue = SUBSCRIPTION_PLANS.find(p => p.id === planId)?.value || 0;

            let newMonthsData = [...(existingMentoria.monthsData || [])];
            const legacyPayments = existingMentoria.payments || Array(6).fill(false);

            for (let i = 0; i <= Math.max(monthIndex, legacyPayments.length - 1, newMonthsData.length - 1); i++) {
                if (!newMonthsData[i]) {
                    newMonthsData[i] = {
                        paid: legacyPayments[i] || false,
                        value: defaultPlanValue
                    };
                }
            }

            if (monthIndex >= newMonthsData.length) return;

            newMonthsData[monthIndex] = {
                ...newMonthsData[monthIndex],
                paid: !newMonthsData[monthIndex].paid
            };

            const updatedData = { ...currentData, billing: { ...currentBilling, mentoria: { ...existingMentoria, monthsData: newMonthsData } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error("Error toggling payment:", error); }
    };

    const handleMentoriaToolOnlyToggle = async (userId: string) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const existingMentoria = currentBilling.mentoria || { payments: Array(6).fill(false) };

            const newDate = existingMentoria.toolOnlyActiveSince ? undefined : new Date().toISOString();
            const updatedData = { ...currentData, billing: { ...currentBilling, mentoria: { ...existingMentoria, toolOnlyActiveSince: newDate } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error(error); }
    };

    const handleMentoriaSetupSave = async (userId: string) => {
        const draftValues = mentoriaDrafts[userId];
        if (!draftValues) return;
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const existingMentoria = currentBilling.mentoria || { payments: Array(6).fill(false) };

            const planId = user.checklistData?.subscriptionPlanId;
            const defaultPlanValue = SUBSCRIPTION_PLANS.find(p => p.id === planId)?.value || 0;

            let newMonthsData = [...(existingMentoria.monthsData || [])];
            const legacyPayments = existingMentoria.payments || Array(6).fill(false);
            for (let i = 0; i < Math.max(legacyPayments.length, newMonthsData.length); i++) {
                if (!newMonthsData[i]) {
                    newMonthsData[i] = {
                        paid: legacyPayments[i] || false,
                        value: defaultPlanValue
                    };
                }
            }

            const finalizedMonthsData = newMonthsData.map((month, idx) => ({ ...month, value: draftValues[idx] === '' ? 0 : Number(draftValues[idx]) }));
            const updatedData = { ...currentData, billing: { ...currentBilling, mentoria: { ...existingMentoria, monthsData: finalizedMonthsData } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error(error); }
    };

    const handleMentoriaAddMonth = async (userId: string) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const existingMentoria = currentBilling.mentoria || { payments: Array(6).fill(false) };

            const planId = user.checklistData?.subscriptionPlanId;
            const defaultPlanValue = SUBSCRIPTION_PLANS.find(p => p.id === planId)?.value || 0;

            let newMonthsData = [...(existingMentoria.monthsData || [])];
            const legacyPayments = existingMentoria.payments || Array(6).fill(false);
            for (let i = 0; i < Math.max(legacyPayments.length, newMonthsData.length); i++) {
                if (!newMonthsData[i]) {
                    newMonthsData[i] = {
                        paid: legacyPayments[i] || false,
                        value: defaultPlanValue
                    };
                }
            }

            const lastValue = newMonthsData.length > 0 ? newMonthsData[newMonthsData.length - 1].value : defaultPlanValue;
            newMonthsData.push({ paid: false, value: lastValue });

            const updatedData = { ...currentData, billing: { ...currentBilling, mentoria: { ...existingMentoria, monthsData: newMonthsData } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error(error); }
    };

    const handleMentoriaRemoveMonth = async (userId: string) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const existingMentoria = currentBilling.mentoria || { payments: [false] };

            const planId = user.checklistData?.subscriptionPlanId;
            const defaultPlanValue = SUBSCRIPTION_PLANS.find(p => p.id === planId)?.value || 0;

            let newMonthsData = [...(existingMentoria.monthsData || [])];
            const legacyPayments = existingMentoria.payments || [false];

            for (let i = 0; i < Math.max(legacyPayments.length, newMonthsData.length); i++) {
                if (!newMonthsData[i]) {
                    newMonthsData[i] = { paid: legacyPayments[i] || false, value: defaultPlanValue };
                }
            }

            if (newMonthsData.length <= 1) return; // Must have at least 1 month
            newMonthsData.pop();

            const updatedData = { ...currentData, billing: { ...currentBilling, mentoria: { ...existingMentoria, monthsData: newMonthsData } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error(error); }
    };

    const handleAcompanhamentoPaymentToggle = async (userId: string, monthIndex: number) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const currentAcompanhamento = currentBilling.acompanhamento || { monthlyValue: 0, payments: [] };

            let newMonthsData = [...(currentAcompanhamento.monthsData || [])];
            const legacyPayments = currentAcompanhamento.payments || [];

            for (let i = 0; i <= Math.max(monthIndex, legacyPayments.length - 1, newMonthsData.length - 1); i++) {
                if (!newMonthsData[i]) {
                    newMonthsData[i] = { paid: legacyPayments[i] || false, value: currentAcompanhamento.monthlyValue || 0 };
                }
            }
            if (monthIndex >= newMonthsData.length) return;
            newMonthsData[monthIndex] = { ...newMonthsData[monthIndex], paid: !newMonthsData[monthIndex].paid };

            const updatedData = { ...currentData, billing: { ...currentBilling, acompanhamento: { ...currentAcompanhamento, monthsData: newMonthsData } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error(error); }
    };

    const handleAcompanhamentoAddMonth = async (userId: string) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const currentAcompanhamento = currentBilling.acompanhamento || { monthlyValue: 0, payments: [] };

            let newMonthsData = [...(currentAcompanhamento.monthsData || [])];
            const legacyPayments = currentAcompanhamento.payments || [];
            for (let i = 0; i < Math.max(legacyPayments.length, newMonthsData.length); i++) {
                if (!newMonthsData[i]) {
                    newMonthsData[i] = { paid: legacyPayments[i] || false, value: currentAcompanhamento.monthlyValue || 0 };
                }
            }
            const lastValue = newMonthsData.length > 0 ? newMonthsData[newMonthsData.length - 1].value : (currentAcompanhamento.monthlyValue || 0);
            newMonthsData.push({ paid: false, value: lastValue });

            const updatedData = { ...currentData, billing: { ...currentBilling, acompanhamento: { ...currentAcompanhamento, monthsData: newMonthsData } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error(error); }
    };

    const handleAcompanhamentoRemoveMonth = async (userId: string) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const currentAcompanhamento = currentBilling.acompanhamento || { monthlyValue: 0, payments: [] };

            let newMonthsData = [...(currentAcompanhamento.monthsData || [])];
            const legacyPayments = currentAcompanhamento.payments || [];

            for (let i = 0; i < Math.max(legacyPayments.length, newMonthsData.length); i++) {
                if (!newMonthsData[i]) {
                    newMonthsData[i] = { paid: legacyPayments[i] || false, value: currentAcompanhamento.monthlyValue || 0 };
                }
            }
            if (newMonthsData.length === 0) return;
            newMonthsData.pop();

            const updatedData = { ...currentData, billing: { ...currentBilling, acompanhamento: { ...currentAcompanhamento, monthsData: newMonthsData } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error(error); }
    };

    const handleAcompanhamentoToolOnlyToggle = async (userId: string) => {
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const currentAcompanhamento = currentBilling.acompanhamento || { monthlyValue: 0, payments: [] };

            const newDate = currentAcompanhamento.toolOnlyActiveSince ? undefined : new Date().toISOString();
            const updatedData = { ...currentData, billing: { ...currentBilling, acompanhamento: { ...currentAcompanhamento, toolOnlyActiveSince: newDate } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error(error); }
    };

    const handleAcompanhamentoSetupSave = async (userId: string) => {
        const draftValues = acompanhamentoDrafts[userId];
        if (!draftValues) return;
        try {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            const currentData = user.checklistData || {};
            const currentBilling = currentData.billing || {};
            const currentAcompanhamento = currentBilling.acompanhamento || { monthlyValue: 0, payments: [] };

            let newMonthsData = [...(currentAcompanhamento.monthsData || [])];
            const legacyPayments = currentAcompanhamento.payments || [];
            for (let i = 0; i < Math.max(legacyPayments.length, newMonthsData.length); i++) {
                if (!newMonthsData[i]) {
                    newMonthsData[i] = { paid: legacyPayments[i] || false, value: currentAcompanhamento.monthlyValue || 0 };
                }
            }

            const finalizedMonthsData = newMonthsData.map((month, idx) => ({ ...month, value: draftValues[idx] === '' ? 0 : Number(draftValues[idx]) }));
            const updatedData = { ...currentData, billing: { ...currentBilling, acompanhamento: { ...currentAcompanhamento, monthsData: finalizedMonthsData } } };
            await authService.updateChecklistData(userId, updatedData);
            setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, checklistData: updatedData } : u));
        } catch (error) { console.error(error); }
    };

    const handleOpenChecklist = async (user: User) => {
        setSelectedUser(user);

        // Fetch financial data for the user to populate the checklist inputs
        try {
            const data = await authService.getDiagnosticByAdmin(user.id);
            setSelectedUserFinancialData(data || undefined);
        } catch (error) {
            console.error("Error fetching financial data for checklist:", error);
            setSelectedUserFinancialData(undefined);
        }

        setShowChecklistModal(true);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const userList = await authService.listUsers();

            // Definição da hierarquia de cargos
            const roleHierarchy: Record<string, number> = {
                'ADMIN': 0,
                'SECRETARY': 1,
                'USER': 2
            };

            const sortedList = (userList || []).sort((a, b) => {
                // 1. Order by Role
                const roleA = roleHierarchy[a.role] ?? 99;
                const roleB = roleHierarchy[b.role] ?? 99;

                if (roleA !== roleB) {
                    return roleA - roleB;
                }

                // 2. If same role, order by creation date (older first -> "ordem de criação")
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });

            setUsers(sortedList);
        } catch (error) {
            console.error('Error loading users:', error);
            alert('Erro ao carregar lista de usuários. Tente recarregar a página.');
        }
    };

    const visibleUsers = (users || []).filter(u => {
        // Secretários só veem usuários comuns
        if (currentUser.role === 'SECRETARY') {
            return u.role === 'USER';
        }
        // Admins veem todos
        return true;
    });

    const filteredUsers = visibleUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const mentoriaUsers = filteredUsers.filter(u =>
        u.role === 'USER' && (
            u.status === 'CONVERTED' ||
            u.status === 'CONTACTED' ||
            (u.status === 'LOST' && !!u.checklistData?.billing?.mentoria)
        )
    );

    const acompanhamentoUsers = filteredUsers.filter(u =>
        u.role === 'USER' && (
            u.status === 'CONTACTED' ||
            (u.status === 'LOST' && !!u.checklistData?.billing?.acompanhamento)
        )
    );

    const consultoriaUsers = filteredUsers.filter(u =>
        u.role === 'USER' && (
            u.status === 'ACTIVE' ||
            u.status === 'CONVERTED' ||
            u.status === 'CONTACTED' ||
            (u.status === 'LOST' && !!u.checklistData?.billing?.consultoria)
        )
    );

    const handleDelete = async (userId: string) => {
        if (confirm('Tem certeza? Isso apaga o usuário e o diagnóstico dele para sempre.')) {
            try {
                await authService.deleteUser(userId);
                loadUsers();
            } catch (error: any) {
                alert('Erro ao deletar usuário: ' + (error.message || 'Erro desconhecido'));
            }
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.password) return alert('Email e senha obrigatórios');

        // Admins podem criar qualquer papel. Se for Secretary, forçamos 'USER' (embora a UI deva impedir)
        const roleToCreate = canCreateAdminOrSecretary ? newUser.role : 'USER';

        const res = await authService.createUserByAdmin({
            ...newUser,
            role: roleToCreate
        });

        if (res.success && res.user) {
            setShowCreate(false);
            setNewUser({ name: '', email: '', whatsapp: '', password: '', role: 'USER' });
            loadUsers();

            // Auto-open Intake Modal
            setIntakeUser(res.user);
            setShowIntakeModal(true);
        } else {
            alert(res.message);
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        const updates: Partial<User> = {
            name: editingUser.name,
            email: editingUser.email,
            whatsapp: editingUser.whatsapp,
        };

        if (editPassword.trim()) {
            updates.password = editPassword.trim();
        }

        const res = await authService.updateUserData(editingUser.id, updates);
        if (res.success) {
            setShowEdit(false);
            setEditingUser(null);
            setEditPassword('');
            loadUsers();
        } else {
            alert(res.message);
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditPassword(''); // Reset password field
        setShowEdit(true);
        setShowCreate(false);
    };

    const handleStatusChange = async (userId: string, newStatus: UserStatus) => {
        try {
            await authService.updateUserStatus(userId, newStatus, currentUser.name);

            // Se mudou para Mentoria ou Acompanhamento, oculta automaticamente a Oferta de Mentoria
            if (newStatus === 'CONVERTED' || newStatus === 'CONTACTED') {
                const user = users.find(u => u.id === userId);
                if (user) {
                    const currentData = user.checklistData || {};
                    if (!currentData.hideNextLevelProposal) {
                        const updatedData = { ...currentData, hideNextLevelProposal: true };
                        await authService.updateChecklistData(userId, updatedData);
                        setUsers(prevUsers => prevUsers.map(u =>
                            u.id === userId
                                ? { ...u, status: newStatus, lastContactedBy: currentUser.name, checklistData: updatedData }
                                : u
                        ));
                        return;
                    }
                }
            }

            loadUsers();
        } catch (error: any) {
            alert('Erro ao atualizar status: ' + (error.message || 'Erro desconhecido'));
        }
    };

    const canCreateUser = currentUser.role === 'ADMIN' || currentUser.role === 'SECRETARY';
    const canCreateAdminOrSecretary = currentUser.role === 'ADMIN';
    const canDelete = currentUser.role === 'ADMIN';

    // Ícones e Labels para Status
    const getStatusInfo = (status: UserStatus) => {
        switch (status) {
            case 'NEW': return { icon: <AlertCircle size={14} />, label: 'Pré-cadastro', color: 'text-slate-500 bg-slate-800' }; // Cinza
            case 'ACTIVE': return { icon: <CheckCircle2 size={14} />, label: 'Consultoria', color: 'text-emerald-400 bg-emerald-500/10' }; // Verde
            case 'CONVERTED': return { icon: <Check size={14} />, label: 'Mentoria', color: 'text-sky-400 bg-sky-500/10' }; // Azul
            case 'CONTACTED': return { icon: <Clock size={14} />, label: 'Acompanhamento', color: 'text-amber-400 bg-amber-500/10' }; // Dourado
            case 'LOST': return { icon: <X size={14} />, label: 'Perdido', color: 'text-rose-400 bg-rose-500/10' };
            default: return { icon: <AlertCircle size={14} />, label: 'Novo', color: 'text-slate-400 bg-slate-800' };
        }
    };

    return (
        <>
            <div className={`fixed inset-0 z-[90] bg-[#0f172a] text-slate-200 overflow-y-auto overflow-x-hidden animate-in fade-in ${showIntakeModal ? 'print:hidden' : ''}`}>
                {/* Header */}
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                        {/* Title & User Info */}
                        <div>
                            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Painel Administrativo</h1>
                            <p className="text-sm text-slate-400">Gerenciamento de usuários e diagnósticos</p>
                        </div>
                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:flex-none min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Buscar nome ou email..."
                                    className="bg-slate-800 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm outline-none focus:border-sky-500 transition-all w-full md:w-64"
                                />
                            </div>
                            {canCreateUser && (
                                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-900 rounded-xl font-bold text-xs uppercase hover:bg-emerald-400 transition-colors shrink-0">
                                    <Plus size={16} /> <span className="hidden sm:inline">Novo Usuário</span><span className="sm:hidden">Novo</span>
                                </button>
                            )}
                            <button onClick={onLogout} className="p-2 bg-slate-800 rounded-xl hover:bg-rose-500 hover:text-white text-slate-400 transition-colors shrink-0" title="Sair do Sistema">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 sm:gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide w-full">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'users'
                                ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            Usuários
                        </button>
                        <button
                            onClick={() => setActiveTab('faturamento')}
                            className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'faturamento'
                                ? 'bg-sky-500 text-slate-900 shadow-lg shadow-sky-500/20'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            Faturamento
                        </button>
                        <button
                            onClick={() => setActiveTab('visao-geral')}
                            className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'visao-geral'
                                ? 'bg-indigo-500 text-slate-900 shadow-lg shadow-indigo-500/20'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                        >
                            Visão Geral
                        </button>
                    </div>

                    {activeTab === 'users' && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                            <div className="overflow-x-auto overflow-y-hidden w-full custom-scrollbar">
                                <table className="w-full min-w-[800px] text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                            <th className="p-4">Usuário</th>
                                            <th className="p-4">Status / Fase</th>
                                            <th className="p-4">Função</th>
                                            <th className="p-4 text-center">Checklist</th>
                                            <th className="p-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map(user => {
                                                const status = getStatusInfo(user.status);
                                                return (
                                                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 font-bold uppercase border border-slate-700">
                                                                    {user.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-slate-200">{user.name}</div>
                                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                                    {user.whatsapp && <div className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1"><MessageCircle size={10} /> {user.whatsapp}</div>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            {user.role === 'USER' ? (
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <div className={`px-2 py-1 rounded-md border flex items-center gap-1.5 ${status.color} border-current/20`}>
                                                                        {status.icon}
                                                                        <span className="text-[10px] font-black uppercase tracking-tight">{status.label}</span>
                                                                    </div>

                                                                    {/* SELECT FOR STATUS CHANGE */}
                                                                    <div className="relative group/edit">
                                                                        <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase cursor-pointer hover:text-sky-400 transition-colors bg-slate-800/50 px-2 py-1 rounded border border-slate-700 hover:border-sky-500/50">
                                                                            <Edit2 size={8} /> Alterar Status
                                                                        </div>
                                                                        <select
                                                                            value={user.status}
                                                                            onChange={(e) => handleStatusChange(user.id, e.target.value as UserStatus)}
                                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                                            title="Alterar status do usuário"
                                                                        >
                                                                            <option className="bg-slate-800 text-slate-300" value="NEW">Pré-cadastro (Bloqueado)</option>
                                                                            <option className="bg-slate-800 text-slate-300" value="ACTIVE">Consultoria (Módulos 1-4)</option>
                                                                            <option className="bg-slate-800 text-slate-300" value="CONVERTED">Mentoria (Módulos 5-10)</option>
                                                                            <option className="bg-slate-800 text-slate-300" value="CONTACTED">Acompanhamento (Todos)</option>
                                                                            <option className="bg-slate-800 text-slate-300" value="LOST">Perdido</option>
                                                                        </select>
                                                                    </div>

                                                                    {user.lastContactedBy && user.status !== 'NEW' && (
                                                                        <span className="text-[8px] text-slate-600 font-bold uppercase">
                                                                            Atualizado por: {user.lastContactedBy}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 text-slate-500 border border-slate-700/50 rounded-md">
                                                                    <Shield size={12} />
                                                                    <span className="text-[9px] font-black uppercase tracking-widest">Acesso Total</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${user.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400' :
                                                                (user.role === 'SECRETARY' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400')
                                                                }`}>
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {user.role === 'USER' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedPhaseUser(user);
                                                                            setShowPhaseModal(true);
                                                                        }}
                                                                        className={`p-2 rounded-lg transition-colors ${user.checklistPhase && user.checklistPhase !== 'LOCKED'
                                                                            ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                                                            : 'bg-slate-800 text-slate-600 hover:bg-slate-700 hover:text-slate-400'
                                                                            }`}
                                                                        title={`Fase Atual: ${user.checklistPhase === 'PHASE_1' ? 'Fase 1' : (user.checklistPhase === 'PHASE_2' ? 'Fase 2' : 'Bloqueado')}`}
                                                                    >
                                                                        <ShieldCheck size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleOpenChecklist(user)} // Use new handler
                                                                        className="p-2 rounded-lg bg-slate-800 text-slate-600 hover:bg-slate-700 hover:text-white transition-colors ml-2"
                                                                        title="Editar Checklist"
                                                                    >
                                                                        <ListChecks size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={() => { setIntakeUser(user); setShowIntakeModal(true); }} className="p-2 hover:bg-sky-500/20 rounded-lg text-slate-500 hover:text-sky-400 transition-colors" title="Ficha Individual"><FileText size={16} /></button>
                                                                {user.role === 'USER' && (
                                                                    <button
                                                                        onClick={() => { setSubscriptionUser(user); setShowSubscriptionModal(true); }}
                                                                        className={`p-2 rounded-lg transition-colors ${user.checklistData?.subscriptionPlanId ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-400'}`}
                                                                        title="Plano de Mentoria"
                                                                    >
                                                                        <CreditCard size={16} />
                                                                    </button>
                                                                )}
                                                                <button onClick={() => openEditModal(user)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"><Edit2 size={16} /></button>
                                                                {user.role === 'USER' && (
                                                                    <button onClick={() => onSelectUser(user.id)} className="p-2 hover:bg-sky-500/20 rounded-lg text-slate-500 hover:text-sky-400 transition-colors"><Eye size={16} /></button>
                                                                )}
                                                                {canDelete && user.id !== currentUser.id && user.id !== 'admin-main' && (
                                                                    <button onClick={() => handleDelete(user.id)} className="p-2 hover:bg-rose-500/20 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'faturamento' && (
                        <div className="animate-in fade-in duration-300">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="bg-slate-900/50 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                <Target size={20} />
                                            </div>
                                            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Total Consultoria</h3>
                                        </div>
                                        <div className="text-3xl font-black text-white">
                                            R$ {consultoriaUsers.reduce((sum, user) => {
                                                const cData = user.checklistData?.billing?.consultoria;
                                                const draft = consultoriaDrafts[user.id];

                                                const baseValue = draft?.baseValue ?? (cData?.baseValue ?? 497);
                                                const isParcelado = (draft?.paymentMethod ?? (cData?.paymentMethod ?? 'a_vista')) === 'parcelado';
                                                const hasDown = draft?.hasDownPayment ?? (cData?.hasDownPayment ?? false);
                                                const downVal = draft?.downPaymentValue ?? (cData?.downPaymentValue ?? 147);

                                                const part1Paid = cData?.part1Paid || false;
                                                const part2Paid = cData?.part2Paid || false;

                                                if (!isParcelado) {
                                                    if (part1Paid) return sum + baseValue;
                                                } else {
                                                    if (!hasDown) {
                                                        if (part1Paid) return sum + baseValue;
                                                    } else {
                                                        let s = sum;
                                                        if (part1Paid) s += downVal;
                                                        if (part2Paid) s += Math.max(0, baseValue - downVal);
                                                        return s;
                                                    }
                                                }
                                                return sum;
                                            }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                <CreditCard size={20} />
                                            </div>
                                            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Total Mentoria</h3>
                                        </div>
                                        <div className="text-3xl font-black text-white">
                                            R$ {mentoriaUsers.reduce((sum, user) => {
                                                const mentoriaData = user.checklistData?.billing?.mentoria;
                                                const defaultPlanValue = SUBSCRIPTION_PLANS.find(p => p.id === user.checklistData?.subscriptionPlanId)?.value || 0;
                                                if (mentoriaData?.monthsData) {
                                                    return sum + mentoriaData.monthsData.reduce((mSum, m) => mSum + (m.paid ? m.value : 0), 0);
                                                }
                                                // Fallback for legacy
                                                return sum + (mentoriaData?.payments || []).reduce((mSum, p) => mSum + (p ? defaultPlanValue : 0), 0);
                                            }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 border border-sky-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                                                <Target size={20} />
                                            </div>
                                            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Total Acompanhamento</h3>
                                        </div>
                                        <div className="text-3xl font-black text-white">
                                            R$ {acompanhamentoUsers.reduce((sum, user) => {
                                                const acData = user.checklistData?.billing?.acompanhamento;
                                                if (acData?.monthsData) {
                                                    return sum + acData.monthsData.reduce((mSum, m) => mSum + (m.paid ? m.value : 0), 0);
                                                }
                                                if (!acData || !acData.payments) return sum;
                                                const paidCount = acData.payments.filter(p => p).length;
                                                return sum + (paidCount * (acData.monthlyValue || 0));
                                            }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 border border-violet-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400">
                                                <DollarSign size={20} />
                                            </div>
                                            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Faturamento (Total)</h3>
                                        </div>
                                        <div className="text-3xl font-black text-white">
                                            R$ {Array.from(new Set([...consultoriaUsers, ...mentoriaUsers, ...acompanhamentoUsers])).reduce((globalSum, user) => {
                                                let consultoriaSum = 0;
                                                { // Scope consultoria logic
                                                    const cData = user.checklistData?.billing?.consultoria;
                                                    const draft = consultoriaDrafts[user.id];

                                                    const baseValue = draft?.baseValue ?? (cData?.baseValue ?? 497);
                                                    const isParcelado = (draft?.paymentMethod ?? (cData?.paymentMethod ?? 'a_vista')) === 'parcelado';
                                                    const hasDown = draft?.hasDownPayment ?? (cData?.hasDownPayment ?? false);
                                                    const downVal = draft?.downPaymentValue ?? (cData?.downPaymentValue ?? 147);

                                                    const part1Paid = cData?.part1Paid || false;
                                                    const part2Paid = cData?.part2Paid || false;

                                                    if (!isParcelado) {
                                                        if (part1Paid) consultoriaSum += baseValue;
                                                    } else {
                                                        if (!hasDown) {
                                                            if (part1Paid) consultoriaSum += baseValue;
                                                        } else {
                                                            if (part1Paid) consultoriaSum += downVal;
                                                            if (part2Paid) consultoriaSum += Math.max(0, baseValue - downVal);
                                                        }
                                                    }
                                                }

                                                let mentoriaSum = 0;
                                                const mentoriaData = user.checklistData?.billing?.mentoria;
                                                const defaultPlanValue = SUBSCRIPTION_PLANS.find(p => p.id === user.checklistData?.subscriptionPlanId)?.value || 0;
                                                if (mentoriaData?.monthsData) {
                                                    mentoriaSum = mentoriaData.monthsData.reduce((mSum, m) => mSum + (m.paid ? m.value : 0), 0);
                                                } else if (mentoriaData?.payments) {
                                                    mentoriaSum = mentoriaData.payments.reduce((mSum, p) => mSum + (p ? defaultPlanValue : 0), 0);
                                                }

                                                let acSum = 0;
                                                const acData = user.checklistData?.billing?.acompanhamento;
                                                if (acData?.monthsData) {
                                                    acSum = acData.monthsData.reduce((mSum, m) => mSum + (m.paid ? m.value : 0), 0);
                                                } else if (acData && acData.payments) {
                                                    const paidCount = acData.payments.filter(p => p).length;
                                                    acSum = paidCount * (acData.monthlyValue || 0);
                                                }
                                                return globalSum + consultoriaSum + mentoriaSum + acSum;
                                            }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Billing SubTabs */}
                            <div className="flex flex-wrap gap-2 mb-6 p-1 bg-slate-900/50 border border-slate-800 rounded-xl w-fit">
                                <button
                                    onClick={() => setBillingSubTab('consultoria')}
                                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${billingSubTab === 'consultoria'
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    Consultoria
                                </button>
                                <button
                                    onClick={() => setBillingSubTab('mentoria')}
                                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${billingSubTab === 'mentoria'
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    Mentoria
                                </button>
                                <button
                                    onClick={() => setBillingSubTab('acompanhamento')}
                                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${billingSubTab === 'acompanhamento'
                                        ? 'bg-slate-800 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    Acompanhamento
                                </button>
                            </div>

                            {/* Billing Content Mentoria */}
                            {billingSubTab === 'mentoria' && (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm mt-6">
                                    <div className="overflow-x-auto overflow-y-hidden w-full custom-scrollbar">
                                        <table className="w-full min-w-[800px] text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                    <th className="p-4 w-1/4">Usuário e Plano</th>
                                                    <th className="p-4 w-1/2">Controle Recorrente (Meses)</th>
                                                    <th className="p-4 text-right w-1/4">Ações & Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {mentoriaUsers.length > 0 ? (
                                                    mentoriaUsers.map((user) => {
                                                        const mentoriaData = user.checklistData?.billing?.mentoria;
                                                        const payments = mentoriaData?.payments || Array(6).fill(false);
                                                        const plan = SUBSCRIPTION_PLANS.find(p => p.id === user.checklistData?.subscriptionPlanId);

                                                        const isToolOnly = !!mentoriaData?.toolOnlyActiveSince;
                                                        const toolDateStr = mentoriaData?.toolOnlyActiveSince
                                                            ? new Date(mentoriaData.toolOnlyActiveSince).toLocaleDateString('pt-BR')
                                                            : '';

                                                        return (
                                                            <tr key={user.id} className={`hover:bg-slate-800/30 transition-colors ${isToolOnly ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''}`}>
                                                                <td className="p-4 align-top">
                                                                    <div className="font-bold text-sm text-slate-200">{user.name}</div>
                                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                                    {plan ? (
                                                                        <div className="mt-1">
                                                                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                                                {plan.label}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="mt-1">
                                                                            <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                                                                                Sem plano
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {isToolOnly && (
                                                                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                                            <AlertCircle size={10} />
                                                                            Ferramenta - {toolDateStr}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-4 align-top">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {(() => {
                                                                            const len = Math.max(mentoriaData?.monthsData?.length || 6, payments.length);
                                                                            const mappedMonths = [];
                                                                            for (let monthIndex = 0; monthIndex < len; monthIndex++) {
                                                                                const draftValue = mentoriaDrafts[user.id]?.[monthIndex] ??
                                                                                    (mentoriaData?.monthsData?.[monthIndex]?.value ?? (plan?.value || 0));
                                                                                const isPaid = mentoriaData?.monthsData ? mentoriaData.monthsData[monthIndex]?.paid : payments[monthIndex];

                                                                                mappedMonths.push(
                                                                                    <div key={monthIndex} className="flex flex-col items-center gap-1">
                                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Mês {monthIndex + 1}</span>
                                                                                        <div className="w-16 relative mt-1">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-bold">R$</span>
                                                                                            <input
                                                                                                type="number"
                                                                                                value={draftValue}
                                                                                                onChange={(e) => {
                                                                                                    const newDrafts = mentoriaDrafts[user.id] ? [...mentoriaDrafts[user.id]] :
                                                                                                        Array(len).fill('').map((_, i) => mentoriaData?.monthsData?.[i]?.value ?? (plan?.value || 0));
                                                                                                    newDrafts[monthIndex] = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                                                                                    setMentoriaDrafts(prev => ({ ...prev, [user.id]: newDrafts }));
                                                                                                }}
                                                                                                disabled={isToolOnly}
                                                                                                className={`w-full bg-slate-800 border border-slate-700 rounded p-1 pl-4 pr-1 text-[10px] outline-none focus:border-emerald-500 text-white text-center ${isPaid ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-300' : ''}`}
                                                                                            />
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => handleMentoriaPaymentToggle(user.id, monthIndex)}
                                                                                            disabled={isToolOnly}
                                                                                            className={`w-8 h-8 rounded mt-1 flex items-center justify-center transition-colors ${isToolOnly && !isPaid
                                                                                                ? 'bg-slate-800/50 border border-slate-700/50 text-slate-600 cursor-not-allowed'
                                                                                                : isPaid
                                                                                                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                                                                                                    : 'bg-slate-800 border border-slate-700 text-slate-500 hover:bg-slate-700'
                                                                                                }`}
                                                                                            title={isPaid ? 'Marcar como não pago' : 'Marcar como pago'}
                                                                                        >
                                                                                            <Check size={16} className={isPaid ? 'opacity-100' : 'opacity-0'} />
                                                                                        </button>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return mappedMonths;
                                                                        })()}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 align-top text-right">
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="p-2 bg-slate-800/50 rounded-lg text-center mb-1">
                                                                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Acumulado</div>
                                                                            <div className="text-sm font-black text-emerald-400">
                                                                                R$ {(() => {
                                                                                    if (mentoriaData?.monthsData) {
                                                                                        return mentoriaData.monthsData.reduce((sum, m) => sum + (m.paid ? m.value : 0), 0);
                                                                                    }
                                                                                    return (payments.filter(p => p).length * (plan?.value || 0));
                                                                                })().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </div>
                                                                        </div>

                                                                        {!isToolOnly && (
                                                                            <>
                                                                                <div className="flex gap-2">
                                                                                    <button
                                                                                        onClick={() => handleMentoriaRemoveMonth(user.id)}
                                                                                        disabled={isToolOnly || Math.max(mentoriaData?.monthsData?.length || 1, payments.length) <= 1}
                                                                                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-colors border ${Math.max(mentoriaData?.monthsData?.length || 1, payments.length) <= 1
                                                                                            ? 'bg-slate-800/50 text-slate-600 border-slate-700/50 cursor-not-allowed'
                                                                                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                                                                                            }`}
                                                                                        title="Remover último mês"
                                                                                    >
                                                                                        - Mês
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleMentoriaAddMonth(user.id)}
                                                                                        disabled={isToolOnly}
                                                                                        className="flex-1 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700 font-bold text-xs uppercase py-2 rounded-lg transition-colors"
                                                                                        title="Adicionar mês"
                                                                                    >
                                                                                        + Mês
                                                                                    </button>
                                                                                </div>
                                                                                <button
                                                                                    onClick={() => handleMentoriaSetupSave(user.id)}
                                                                                    className="w-full bg-emerald-500/10 text-emerald-400 font-bold text-xs uppercase py-2 rounded-lg border border-emerald-500/20 transition-colors hover:bg-emerald-500/20"
                                                                                >
                                                                                    Salvar Valores
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleMentoriaToolOnlyToggle(user.id)}
                                                                            className={`w-full font-bold text-xs uppercase px-3 py-2 rounded-lg transition-colors border ${isToolOnly
                                                                                ? 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white'
                                                                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                                                                }`}
                                                                        >
                                                                            {isToolOnly ? 'Remover Só Ferramenta' : 'Só Ferramenta'}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={9} className="p-8 text-center text-slate-500">
                                                            Nenhum usuário em Mentoria.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Billing Content Acompanhamento */}
                            {billingSubTab === 'acompanhamento' && (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm mt-6">
                                    <div className="overflow-x-auto overflow-y-hidden w-full custom-scrollbar">
                                        <table className="w-full min-w-[800px] text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                    <th className="p-4 w-1/4">Usuário e Status</th>
                                                    <th className="p-4 w-1/2">Controle Recorrente (Meses)</th>
                                                    <th className="p-4 text-right w-1/4">Ações & Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {acompanhamentoUsers.length > 0 ? (
                                                    acompanhamentoUsers.map((user) => {
                                                        const acompanhamentoData = user.checklistData?.billing?.acompanhamento;
                                                        const payments = acompanhamentoData?.payments || [];
                                                        const isToolOnly = !!acompanhamentoData?.toolOnlyActiveSince;
                                                        const toolDateStr = acompanhamentoData?.toolOnlyActiveSince
                                                            ? new Date(acompanhamentoData.toolOnlyActiveSince).toLocaleDateString('pt-BR')
                                                            : '';

                                                        return (
                                                            <tr key={user.id} className={`hover:bg-slate-800/30 transition-colors ${isToolOnly ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''}`}>
                                                                <td className="p-4 align-top">
                                                                    <div className="font-bold text-sm text-slate-200">{user.name}</div>
                                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                                    {isToolOnly && (
                                                                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-md text-[9px] font-black uppercase tracking-wider">
                                                                            <AlertCircle size={10} />
                                                                            Ferramenta - {toolDateStr}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-4 align-top">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {(() => {
                                                                            const len = Math.max(acompanhamentoData?.monthsData?.length || 0, payments.length);
                                                                            const mappedMonths = [];
                                                                            for (let monthIndex = 0; monthIndex < len; monthIndex++) {
                                                                                const draftValue = acompanhamentoDrafts[user.id]?.[monthIndex] ??
                                                                                    (acompanhamentoData?.monthsData?.[monthIndex]?.value ?? (acompanhamentoData?.monthlyValue || 0));
                                                                                const isPaid = acompanhamentoData?.monthsData ? acompanhamentoData.monthsData[monthIndex]?.paid : payments[monthIndex];

                                                                                mappedMonths.push(
                                                                                    <div key={monthIndex} className="flex flex-col items-center gap-1">
                                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Mês {monthIndex + 1}</span>
                                                                                        <div className="w-16 relative mt-1">
                                                                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-bold">R$</span>
                                                                                            <input
                                                                                                type="number"
                                                                                                value={draftValue}
                                                                                                onChange={(e) => {
                                                                                                    const newDrafts = acompanhamentoDrafts[user.id] ? [...acompanhamentoDrafts[user.id]] :
                                                                                                        Array(len).fill('').map((_, i) => acompanhamentoData?.monthsData?.[i]?.value ?? (acompanhamentoData?.monthlyValue || 0));
                                                                                                    newDrafts[monthIndex] = e.target.value === '' ? '' : parseInt(e.target.value) || 0;
                                                                                                    setAcompanhamentoDrafts(prev => ({ ...prev, [user.id]: newDrafts }));
                                                                                                }}
                                                                                                disabled={isToolOnly}
                                                                                                className={`w-full bg-slate-800 border border-slate-700 rounded p-1 pl-4 pr-1 text-[10px] outline-none focus:border-emerald-500 text-white text-center ${isPaid ? 'border-sky-500/50 bg-sky-500/5 text-sky-300' : ''}`}
                                                                                            />
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => handleAcompanhamentoPaymentToggle(user.id, monthIndex)}
                                                                                            disabled={isToolOnly}
                                                                                            className={`w-8 h-8 rounded-lg mt-1 flex items-center justify-center transition-all bg-slate-800 shadow-sm ${isToolOnly && !isPaid
                                                                                                ? 'border border-slate-700/50 text-slate-600 cursor-not-allowed shadow-none'
                                                                                                : isPaid
                                                                                                    ? 'bg-sky-500 text-white shadow-sky-500/20'
                                                                                                    : 'border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                                                                                                }`}
                                                                                            title={isPaid ? 'Marcar como não pago' : 'Marcar como pago'}
                                                                                        >
                                                                                            <Check size={16} className={`${isPaid ? 'opacity-100 scale-100' : 'opacity-0 scale-50 transition-all'}`} />
                                                                                        </button>
                                                                                    </div>
                                                                                );
                                                                            }
                                                                            return mappedMonths;
                                                                        })()}

                                                                        <div className="flex gap-2 items-center ml-2 border-l border-slate-800 pl-4">
                                                                            <button
                                                                                onClick={() => handleAcompanhamentoAddMonth(user.id)}
                                                                                disabled={isToolOnly}
                                                                                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isToolOnly
                                                                                    ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700/50'
                                                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
                                                                                    }`}
                                                                                title="Adicionar mais um mês de pagamento"
                                                                            >
                                                                                <Plus size={16} />
                                                                            </button>
                                                                            {Math.max(acompanhamentoData?.monthsData?.length || 0, payments.length) > 0 && (
                                                                                <button
                                                                                    onClick={() => handleAcompanhamentoRemoveMonth(user.id)}
                                                                                    disabled={isToolOnly}
                                                                                    className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isToolOnly
                                                                                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-700/50'
                                                                                        : 'bg-slate-800 text-rose-400 hover:bg-rose-500/20 border border-slate-700'
                                                                                        }`}
                                                                                    title="Remover último mês"
                                                                                >
                                                                                    <Trash2 size={16} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right align-top">
                                                                    <div className="flex flex-col gap-3 h-full justify-between">
                                                                        <div className="p-2 bg-slate-800/50 rounded-lg text-center">
                                                                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Acumulado</div>
                                                                            <div className="text-sm font-black text-sky-400">
                                                                                R$ {(() => {
                                                                                    if (acompanhamentoData?.monthsData) {
                                                                                        return acompanhamentoData.monthsData.reduce((sum, m) => sum + (m.paid ? m.value : 0), 0);
                                                                                    }
                                                                                    return (payments.filter(p => p).length * (acompanhamentoData?.monthlyValue || 0));
                                                                                })().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex flex-col gap-2 mt-auto">
                                                                            {!isToolOnly && (
                                                                                <button
                                                                                    onClick={() => handleAcompanhamentoSetupSave(user.id)}
                                                                                    className="w-full bg-sky-500/10 text-sky-400 font-bold text-xs uppercase py-2 rounded-lg hover:bg-sky-500/20 transition-colors border border-sky-500/20"
                                                                                >
                                                                                    Salvar Valores
                                                                                </button>
                                                                            )}
                                                                            <button
                                                                                onClick={() => handleAcompanhamentoToolOnlyToggle(user.id)}
                                                                                className={`w-full font-bold text-xs uppercase px-3 py-2 rounded-lg transition-colors border ${isToolOnly
                                                                                    ? 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white'
                                                                                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                                                                    }`}
                                                                            >
                                                                                {isToolOnly ? 'Remover Só Ferramenta' : 'Só Ferramenta'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={3} className="p-8 text-center text-slate-500">
                                                            Nenhum usuário em Acompanhamento.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Billing Content Consultoria */}
                            {billingSubTab === 'consultoria' && (
                                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm mt-6">
                                    <div className="overflow-x-auto overflow-y-hidden w-full custom-scrollbar">
                                        <table className="w-full min-w-[800px] text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                                    <th className="p-4 w-1/4">Usuário</th>
                                                    <th className="p-4 w-1/4">Configuração</th>
                                                    <th className="p-4 w-1/4 text-center">Pagamentos</th>
                                                    <th className="p-4 text-right w-1/4">Ações & Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {consultoriaUsers.length > 0 ? (
                                                    consultoriaUsers.map((user) => {
                                                        const consultoriaData = user.checklistData?.billing?.consultoria;
                                                        const draft = consultoriaDrafts[user.id];

                                                        const baseValue = draft?.baseValue ?? (consultoriaData?.baseValue ?? 497);
                                                        const paymentMethod = draft?.paymentMethod ?? (consultoriaData?.paymentMethod ?? 'a_vista');
                                                        const hasDownPayment = draft?.hasDownPayment ?? (consultoriaData?.hasDownPayment ?? false);
                                                        const downPaymentValue = draft?.downPaymentValue ?? (consultoriaData?.downPaymentValue ?? 147);

                                                        const part1Paid = consultoriaData?.part1Paid || false;
                                                        const part2Paid = consultoriaData?.part2Paid || false;

                                                        let totalPago = 0;
                                                        if (paymentMethod === 'a_vista') {
                                                            if (part1Paid) totalPago = baseValue;
                                                        } else {
                                                            if (!hasDownPayment) {
                                                                if (part1Paid) totalPago = baseValue;
                                                            } else {
                                                                if (part1Paid) totalPago += downPaymentValue;
                                                                if (part2Paid) totalPago += Math.max(0, baseValue - downPaymentValue);
                                                            }
                                                        }

                                                        return (
                                                            <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                                                <td className="p-4 align-top">
                                                                    <div className="font-bold text-sm text-slate-200">{user.name}</div>
                                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                                </td>
                                                                <td className="p-4 align-top">
                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="flex gap-2 items-center">
                                                                            <span className="text-[10px] font-bold text-slate-500 uppercase w-16">Valor:</span>
                                                                            <div className="relative flex-1">
                                                                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">R$</span>
                                                                                <input
                                                                                    type="number"
                                                                                    value={baseValue}
                                                                                    onChange={(e) => handleConsultoriaDraftChange(user.id, 'baseValue', Number(e.target.value) || 0)}
                                                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 pl-7 text-xs outline-none focus:border-emerald-500 text-white"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2 items-center">
                                                                            <span className="text-[10px] font-bold text-slate-500 uppercase w-16">Tipo:</span>
                                                                            <select
                                                                                value={paymentMethod}
                                                                                onChange={(e) => handleConsultoriaDraftChange(user.id, 'paymentMethod', e.target.value as any)}
                                                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs outline-none focus:border-emerald-500 text-white"
                                                                            >
                                                                                <option value="a_vista">À Vista</option>
                                                                                <option value="parcelado">Parcelado</option>
                                                                            </select>
                                                                        </div>
                                                                        {paymentMethod === 'parcelado' && (
                                                                            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 mt-1">
                                                                                <div className="flex gap-2 items-center mb-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={hasDownPayment}
                                                                                        onChange={(e) => handleConsultoriaDraftChange(user.id, 'hasDownPayment', e.target.checked)}
                                                                                        className="w-3 h-3 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500 text-emerald-500"
                                                                                    />
                                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Teve Entrada?</span>
                                                                                </div>
                                                                                {hasDownPayment && (
                                                                                    <div className="flex gap-2 items-center pl-5">
                                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase w-12 text-right">Valor:</span>
                                                                                        <div className="relative flex-1">
                                                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">R$</span>
                                                                                            <input
                                                                                                type="number"
                                                                                                value={downPaymentValue}
                                                                                                onChange={(e) => handleConsultoriaDraftChange(user.id, 'downPaymentValue', Number(e.target.value) || 0)}
                                                                                                className="w-full bg-slate-900 border border-slate-700 rounded p-1 pl-6 text-[10px] outline-none focus:border-emerald-500 text-white"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 align-top text-center">
                                                                    <div className="flex flex-col items-center justify-center h-full pt-2">
                                                                        <div className="flex gap-4">
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{hasDownPayment && paymentMethod === 'parcelado' ? 'Entrada' : 'Valor Total'}</span>
                                                                                <span className="text-[10px] font-bold text-emerald-500 mb-1">
                                                                                    R$ {hasDownPayment && paymentMethod === 'parcelado' ? downPaymentValue : baseValue}
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => handleConsultoriaPaymentToggle(user.id, 1)}
                                                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-slate-800 shadow-sm ${part1Paid
                                                                                        ? 'bg-emerald-500 text-white shadow-emerald-500/20 border-emerald-500'
                                                                                        : 'border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                                                                                        }`}
                                                                                    title={part1Paid ? 'Marcar como não pago' : 'Marcar como pago'}
                                                                                >
                                                                                    <Check size={16} className={`${part1Paid ? 'opacity-100 scale-100' : 'opacity-0 scale-50 transition-all'}`} />
                                                                                </button>
                                                                            </div>

                                                                            {paymentMethod === 'parcelado' && hasDownPayment && (
                                                                                <div className="flex flex-col items-center gap-1 border-l border-slate-800 pl-4">
                                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Restante</span>
                                                                                    <span className="text-[10px] font-bold text-emerald-500 mb-1">
                                                                                        R$ {Math.max(0, baseValue - downPaymentValue)}
                                                                                    </span>
                                                                                    <button
                                                                                        onClick={() => handleConsultoriaPaymentToggle(user.id, 2)}
                                                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-slate-800 shadow-sm ${part2Paid
                                                                                            ? 'bg-emerald-500 text-white shadow-emerald-500/20 border-emerald-500'
                                                                                            : 'border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white'
                                                                                            }`}
                                                                                        title={part2Paid ? 'Marcar como não pago' : 'Marcar como pago'}
                                                                                    >
                                                                                        <Check size={16} className={`${part2Paid ? 'opacity-100 scale-100' : 'opacity-0 scale-50 transition-all'}`} />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-right align-top">
                                                                    <div className="flex flex-col gap-3 h-full justify-between">
                                                                        <div className="p-2 bg-slate-800/50 rounded-lg text-center">
                                                                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Acumulado</div>
                                                                            <div className="text-sm font-black text-emerald-400">
                                                                                R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleConsultoriaSetupSave(user.id)}
                                                                            className="w-full bg-emerald-500/10 text-emerald-400 font-bold text-xs uppercase py-2 rounded-lg hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 mt-auto"
                                                                        >
                                                                            Salvar Valores
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="p-8 text-center text-slate-500">
                                                            Nenhum usuário em Consultoria.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'visao-geral' && (() => {
                        const validUsers = users.filter(u => u.role === 'USER' && (u.status === 'ACTIVE' || u.status === 'CONVERTED' || u.status === 'CONTACTED'));
                        const totalValid = validUsers.length;

                        const consultoriaCount = validUsers.filter(u => u.status === 'ACTIVE').length;
                        const mentoriaCount = validUsers.filter(u => u.status === 'CONVERTED').length;
                        const acompanhamentoCount = validUsers.filter(u => u.status === 'CONTACTED').length;

                        const consultoriaPct = totalValid > 0 ? (consultoriaCount / totalValid) * 100 : 0;
                        const mentoriaPct = totalValid > 0 ? (mentoriaCount / totalValid) * 100 : 0;
                        const acompanhamentoPct = totalValid > 0 ? (acompanhamentoCount / totalValid) * 100 : 0;

                        return (
                            <div className="animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    {/* Consultoria Metric */}
                                    <div className="bg-slate-900/50 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent"></div>
                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                                        <CheckCircle2 size={20} />
                                                    </div>
                                                    <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Consultoria</h3>
                                                </div>
                                                <div className="text-3xl font-black text-emerald-400">{consultoriaCount}</div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                                                    <span>Porcentagem do Total</span>
                                                    <span className="text-emerald-500">{consultoriaPct.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${consultoriaPct}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mentoria Metric */}
                                    <div className="bg-slate-900/50 border border-sky-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent"></div>
                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                                                        <Check size={20} />
                                                    </div>
                                                    <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Mentoria</h3>
                                                </div>
                                                <div className="text-3xl font-black text-sky-400">{mentoriaCount}</div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                                                    <span>Porcentagem do Total</span>
                                                    <span className="text-sky-400">{mentoriaPct.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-sky-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${mentoriaPct}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Acompanhamento Metric */}
                                    <div className="bg-slate-900/50 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent"></div>
                                        <div className="relative z-10 flex flex-col h-full justify-between">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                        <Clock size={20} />
                                                    </div>
                                                    <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider">Acompanhamento</h3>
                                                </div>
                                                <div className="text-3xl font-black text-amber-500">{acompanhamentoCount}</div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                                                    <span>Porcentagem do Total</span>
                                                    <span className="text-amber-500">{acompanhamentoPct.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-amber-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${acompanhamentoPct}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                                        <UserIcon size={24} />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-1">Total de Clientes Ativos</h4>
                                    <div className="text-4xl font-black text-white mb-2">{totalValid}</div>
                                    <p className="text-xs text-slate-400 max-w-lg">
                                        Esta visão geral considera apenas os clientes que estão atualmente nas fases de <strong>Consultoria</strong>, <strong>Mentoria</strong> e <strong>Acompanhamento</strong>. Usuários novos ou perdidos não entram neste cálculo de proporção.
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {showCreate && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4">Novo Usuário</h3>
                            <div className="space-y-3">
                                <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Nome" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500" />
                                <input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500" />
                                <input value={newUser.whatsapp} onChange={e => setNewUser({ ...newUser, whatsapp: e.target.value })} placeholder="Whatsapp" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500" />
                                <input value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Senha" type="password" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500" />

                                {/* Role Selection: Visible only if ADMIN */}
                                {canCreateAdminOrSecretary && (
                                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-emerald-500 text-slate-300">
                                        <option value="USER" className="bg-slate-800">Usuário</option>
                                        <option value="SECRETARY" className="bg-slate-800">Secretário</option>
                                        <option value="ADMIN" className="bg-slate-800">Admin</option>
                                    </select>
                                )}

                                <div className="flex gap-2 mt-4 pt-2">

                                    <button onClick={() => setShowCreate(false)} className="flex-1 py-3 bg-slate-800 rounded-xl text-slate-400 font-bold text-xs uppercase hover:bg-slate-700">Cancelar</button>
                                    <button onClick={handleCreateUser} className="flex-1 py-3 bg-emerald-500 rounded-xl text-slate-900 font-bold text-xs uppercase hover:bg-emerald-400">Criar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showEdit && editingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4">Editar Usuário</h3>
                            <div className="space-y-3">
                                <input value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} placeholder="Nome" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-sky-500" />
                                <input value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} placeholder="Email" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-sky-500" />
                                <input value={editingUser.whatsapp} onChange={e => setEditingUser({ ...editingUser, whatsapp: e.target.value })} placeholder="Whatsapp" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-sky-500" />
                                <input value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Nova Senha (opcional)" type="password" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:border-sky-500" />
                                <div className="flex gap-2 mt-4 pt-2">
                                    <button onClick={() => setShowEdit(false)} className="flex-1 py-3 bg-slate-800 rounded-xl text-slate-400 font-bold text-xs uppercase hover:bg-slate-700">Cancelar</button>
                                    <button onClick={handleUpdateUser} className="flex-1 py-3 bg-sky-500 rounded-xl text-slate-900 font-bold text-xs uppercase hover:bg-sky-400">Salvar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div >

            {showIntakeModal && intakeUser && (
                <UserIntakeModal
                    user={intakeUser}
                    isOpen={showIntakeModal}
                    onClose={() => setShowIntakeModal(false)}
                />
            )
            }


            {
                showChecklistModal && selectedUser && (
                    <ChecklistModal
                        isOpen={showChecklistModal}
                        onClose={() => {
                            setShowChecklistModal(false);
                            setSelectedUser(null);
                        }}
                        initialProgress={selectedUser.checklistProgress || []}
                        initialData={selectedUser.checklistData || {}}
                        readOnly={false}
                        financialData={selectedUserFinancialData}
                        phase={selectedUser.checklistPhase || 'LOCKED'}
                        onSave={async (newProgress, newData) => { // Updated signature
                            if (selectedUser) {
                                await authService.updateChecklistProgress(selectedUser.id, newProgress);
                                await authService.updateChecklistData(selectedUser.id, newData);

                                // Atualizar estado local
                                // Atualizar estado local
                                setUsers(prevUsers => prevUsers.map(u =>
                                    u.id === selectedUser.id ? {
                                        ...u,
                                        checklistProgress: newProgress,
                                        checklistData: newData
                                    } : u
                                ));

                                setSelectedUser(prev => prev ? {
                                    ...prev,
                                    checklistProgress: newProgress,
                                    checklistData: newData
                                } : null);
                            }
                        }}
                    />
                )
            }
            {
                showPhaseModal && selectedPhaseUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <ShieldCheck size={20} className="text-emerald-500" />
                                        Fase do Checklist
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">Gerencie o nível de acesso do usuário.</p>
                                </div>
                                <button
                                    onClick={() => setShowPhaseModal(false)}
                                    className="text-slate-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        if (selectedPhaseUser) {
                                            authService.updateUserChecklistPhase(selectedPhaseUser.id, 'LOCKED');
                                            setUsers(users.map(u => u.id === selectedPhaseUser.id ? { ...u, checklistPhase: 'LOCKED' } : u));
                                            setShowPhaseModal(false);
                                        }
                                    }}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all ${selectedPhaseUser.checklistPhase === 'LOCKED' || !selectedPhaseUser.checklistPhase
                                        ? 'bg-slate-800 border-rose-500/50 text-white shadow-lg shadow-rose-900/10'
                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${selectedPhaseUser.checklistPhase === 'LOCKED' || !selectedPhaseUser.checklistPhase ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-900 text-slate-600'}`}>
                                            <Lock size={18} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-sm font-bold uppercase">Bloqueado</span>
                                            <span className="block text-[10px] opacity-70">Sem acesso ao checklist</span>
                                        </div>
                                    </div>
                                    {(selectedPhaseUser.checklistPhase === 'LOCKED' || !selectedPhaseUser.checklistPhase) && <CheckCircle2 size={18} className="text-rose-500" />}
                                </button>

                                <button
                                    onClick={() => {
                                        if (selectedPhaseUser) {
                                            authService.updateUserChecklistPhase(selectedPhaseUser.id, 'PHASE_1');
                                            setUsers(users.map(u => u.id === selectedPhaseUser.id ? { ...u, checklistPhase: 'PHASE_1' } : u));
                                            setShowPhaseModal(false);
                                        }
                                    }}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all ${selectedPhaseUser.checklistPhase === 'PHASE_1'
                                        ? 'bg-slate-800 border-rose-500/50 text-white shadow-lg shadow-rose-900/10'
                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${selectedPhaseUser.checklistPhase === 'PHASE_1' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-900 text-slate-600'}`}>
                                            <ListChecks size={18} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-sm font-bold uppercase">Fase 1: Diagnóstico</span>
                                            <span className="block text-[10px] opacity-70">Checklist base (Sanhaço)</span>
                                        </div>
                                    </div>
                                    {selectedPhaseUser.checklistPhase === 'PHASE_1' && <CheckCircle2 size={18} className="text-rose-500" />}
                                </button>

                                <button
                                    onClick={() => {
                                        if (selectedPhaseUser) {
                                            authService.updateUserChecklistPhase(selectedPhaseUser.id, 'PHASE_2');
                                            setUsers(users.map(u => u.id === selectedPhaseUser.id ? { ...u, checklistPhase: 'PHASE_2' } : u));
                                            setShowPhaseModal(false);
                                        }
                                    }}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all ${selectedPhaseUser.checklistPhase === 'PHASE_2'
                                        ? 'bg-slate-800 border-amber-500/50 text-white shadow-lg shadow-amber-900/10'
                                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${selectedPhaseUser.checklistPhase === 'PHASE_2' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-900 text-slate-600'}`}>
                                            <Target size={18} />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-sm font-bold uppercase">Fase 2: Retorno</span>
                                            <span className="block text-[10px] opacity-70">Negociação e Ajustes</span>
                                        </div>
                                    </div>
                                    {selectedPhaseUser.checklistPhase === 'PHASE_2' && <CheckCircle2 size={18} className="text-amber-500" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* SUBSCRIPTION PLAN MODAL */}
            {
                showSubscriptionModal && subscriptionUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tight">
                                        <CreditCard size={20} className="text-emerald-500" />
                                        Plano de Mentoria
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">
                                        Defina o plano visível para <strong className="text-slate-300">{subscriptionUser.name}</strong>.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowSubscriptionModal(false);
                                        setSubscriptionUser(null);
                                    }}
                                    className="text-slate-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {SUBSCRIPTION_PLANS.map(plan => {
                                    const currentPlanId = subscriptionUser.checklistData?.subscriptionPlanId;
                                    const isSelected = currentPlanId === plan.id;

                                    return (
                                        <button
                                            key={plan.id}
                                            onClick={async () => {
                                                const newChecklistData = { ...subscriptionUser.checklistData, subscriptionPlanId: plan.id };
                                                await authService.updateChecklistData(subscriptionUser.id, newChecklistData);

                                                // Update local state
                                                setUsers(users.map(u => u.id === subscriptionUser.id ? { ...u, checklistData: newChecklistData } : u));
                                                setShowSubscriptionModal(false);
                                                setSubscriptionUser(null);
                                            }}
                                            className={`w-full p-4 rounded-xl border flex items-center justify-between group transition-all ${isSelected
                                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-lg shadow-emerald-900/10'
                                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center w-full pr-2">
                                                <span className="text-sm font-bold uppercase">{plan.label}</span>
                                            </div>
                                            {isSelected && <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={async () => {
                                        const newChecklistData = { ...subscriptionUser.checklistData };
                                        delete newChecklistData.subscriptionPlanId;
                                        await authService.updateChecklistData(subscriptionUser.id, newChecklistData);

                                        setUsers(users.map(u => u.id === subscriptionUser.id ? { ...u, checklistData: newChecklistData } : u));
                                        setShowSubscriptionModal(false);
                                        setSubscriptionUser(null);
                                    }}
                                    className="w-full p-4 rounded-xl border border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                                >
                                    Remover Plano
                                </button>

                                <div className="mt-4 pt-4 border-t border-slate-800">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!subscriptionUser.checklistData?.hideNextLevelProposal}
                                            onChange={async (e) => {
                                                const newChecklistData = { ...subscriptionUser.checklistData, hideNextLevelProposal: e.target.checked };
                                                await authService.updateChecklistData(subscriptionUser.id, newChecklistData);
                                                // Update local state and current subscription user to reflect changes interactively
                                                setUsers(users.map(u => u.id === subscriptionUser.id ? { ...u, checklistData: newChecklistData } : u));
                                                setSubscriptionUser({ ...subscriptionUser, checklistData: newChecklistData });
                                            }}
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm font-medium text-slate-300">
                                            Ocultar "Pronto para o Próximo Nível" no painel do usuário
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

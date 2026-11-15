import React, { useState, useEffect } from 'react';
import { Header } from '../common/Header';
import { storage } from '../../services/storage';
import { SchoolPlan } from '../../types';
import { Edit2, Check, Plus, Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface SuperAdminPlansProps {
  onShowToast: (msg: string) => void;
}

export const SuperAdminPlans: React.FC<SuperAdminPlansProps> = ({ onShowToast }) => {
  const { t, tPlanText } = useLanguage();
  const [plans, setPlans] = useState<SchoolPlan[]>(() => storage.getAllPlans());

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      setPlans(storage.getAllPlans());
    });
    return unsub;
  }, []);

  // Edit modal state
  const [editingPlan, setEditingPlan] = useState<SchoolPlan | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [studentLimit, setStudentLimit] = useState(0);
  const [featuresText, setFeaturesText] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Add plan modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<number>(50);
  const [newStudentLimit, setNewStudentLimit] = useState<number>(200);
  const [newFeaturesText, setNewFeaturesText] = useState('Up to 200 students\nStudent profile & enrollment\nDaily attendance\nBilling and reports');
  const [newIsPopular, setNewIsPopular] = useState(false);

  const openEdit = (plan: SchoolPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPrice(plan.price);
    setStudentLimit(plan.studentLimit);
    setFeaturesText(plan.features.join('\n'));
    setIsPopular(!!plan.popular);
    setIsHidden(!!plan.hidden);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const updated: SchoolPlan = {
      ...editingPlan,
      name: name.trim(),
      price: Number(price),
      studentLimit: Number(studentLimit),
      popular: isPopular,
      hidden: isHidden,
      features: featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    };

    try {
      if (isPopular) {
        await storage.setPopularPlan(updated.id);
      }
      await storage.savePlan(updated);
      setEditingPlan(null);
      onShowToast(t('sa_plans_updatedToast', { name: tPlanText(updated.name) }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to save plan.');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      const created = await storage.addPlan({
        name: newName.trim(),
        price: Number(newPrice),
        studentLimit: Number(newStudentLimit),
        popular: newIsPopular,
        hidden: false,
        features: newFeaturesText
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
      });

      if (newIsPopular) {
        await storage.setPopularPlan(created.id);
      }

      setShowAddModal(false);
      setNewName('');
      setNewPrice(50);
      setNewStudentLimit(200);
      setNewIsPopular(false);
      onShowToast(t('sa_plans_createdToast', { name: created.name }));
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to create plan.');
    }
  };

  const handleToggleHighlight = async (plan: SchoolPlan) => {
    try {
      if (plan.popular) {
        await storage.savePlan({ ...plan, popular: false });
        onShowToast(t('sa_plans_unhighlightToast', { name: tPlanText(plan.name) }));
      } else {
        await storage.setPopularPlan(plan.id);
        onShowToast(t('sa_plans_highlightToast', { name: tPlanText(plan.name) }));
      }
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to update plan highlight.');
    }
  };

  const handleToggleHidden = async (plan: SchoolPlan) => {
    try {
      await storage.togglePlanHidden(plan.id);
      onShowToast(
        plan.hidden
          ? t('sa_plans_shownToast', { name: tPlanText(plan.name) })
          : t('sa_plans_hiddenToast', { name: tPlanText(plan.name) })
      );
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Failed to toggle plan visibility.');
    }
  };

  const handleDeletePlan = async (plan: SchoolPlan) => {
    if (confirm(t('sa_plans_confirmDelete', { name: tPlanText(plan.name) }))) {
      try {
        await storage.deletePlan(plan.id);
        onShowToast(t('sa_plans_deletedToast', { name: tPlanText(plan.name) }));
      } catch (err) {
        onShowToast(err instanceof Error ? err.message : 'Failed to delete plan.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title={t('sa_plans_title')}
        subtitle={t('sa_plans_subtitle')}
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-[#5458A7] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:opacity-95 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>{t('sa_plans_addPlan')}</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`border-2 rounded-[24px] sm:rounded-[28px] p-5 sm:p-7 flex flex-col justify-between bg-white shadow-xs transition-all min-w-0 ${
              plan.popular
                ? 'border-[#5458A7] ring-2 ring-[#5458A7]/20'
                : 'border-[#E4E6F3]'
            } ${plan.hidden ? 'opacity-60 bg-gray-50' : ''}`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold font-sora text-[#23265A]">
                    {tPlanText(plan.name)}
                  </span>
                  {plan.hidden && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                      {t('sa_plans_hidden')}
                    </span>
                  )}
                </div>
                {plan.popular && (
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#EEEEF8] text-[#5458A7]">
                    {t('sa_plans_highlighted')}
                  </span>
                )}
              </div>

              <div>
                <div className="text-3xl font-extrabold font-sora text-[#23265A]">
                  <span className="ltr-inline">${plan.price.toFixed(2)}</span>
                  <span className="text-xs text-[#6B7280] font-normal ms-1">{t('common_mo')}</span>
                </div>
                <div className="text-xs font-bold text-[#5458A7] mt-1">
                  {t('land_pricing_upToStudents', { count: plan.studentLimit })}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-[#F0F2FA]">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#4A5080]">
                    <Check size={14} className="text-[#5458A7] shrink-0 mt-0.5" />
                    <span>{tPlanText(f)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleHighlight(plan)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    plan.popular
                      ? 'bg-[#EEEEF8] border-[#5458A7] text-[#5458A7]'
                      : 'border-[#D5D7EE] text-[#6B7280] hover:bg-[#F3F4FB]'
                  }`}
                >
                  <Star size={13} className={plan.popular ? 'fill-[#5458A7]' : ''} />
                  <span>{plan.popular ? t('sa_plans_highlighted') : t('sa_plans_highlight')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleHidden(plan)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    plan.hidden
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-[#D5D7EE] text-[#6B7280] hover:bg-[#F3F4FB]'
                  }`}
                >
                  {plan.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{plan.hidden ? t('sa_plans_unhide') : t('sa_plans_hide')}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#5458A7] text-white py-2 rounded-full font-bold text-xs hover:opacity-95 transition-all cursor-pointer shadow-xs"
                >
                  <Edit2 size={13} />
                  <span>{t('sa_plans_editBtn')}</span>
                </button>
                {plans.length > 1 && (
                  <button
                    onClick={() => handleDeletePlan(plan)}
                    className="p-2 rounded-full border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
                    title={t('common_delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] sm:rounded-[28px] max-w-[calc(100vw-2rem)] sm:max-w-lg w-full p-5 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl sm:text-2xl font-extrabold font-sora text-[#23265A] mb-4">
              {t('sa_plans_editTitle', { name: tPlanText(editingPlan.name) })}
            </h3>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('sa_plans_name')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] text-sm focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('sa_plans_priceMo')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    dir="ltr"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] text-sm text-start focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('sa_plans_maxStudents')}
                  </label>
                  <input
                    type="number"
                    required
                    dir="ltr"
                    value={studentLimit}
                    onChange={(e) => setStudentLimit(parseInt(e.target.value) || 0)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] text-sm text-start focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('sa_plans_features')}
                </label>
                <textarea
                  rows={4}
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-1">
                <label className="flex items-center gap-2 min-h-[40px] cursor-pointer text-xs font-bold text-[#23265A]">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="w-5 h-5 accent-[#5458A7] rounded"
                  />
                  <span>{t('sa_plans_popularToggle')}</span>
                </label>

                <label className="flex items-center gap-2 min-h-[40px] cursor-pointer text-xs font-bold text-[#6B7280]">
                  <input
                    type="checkbox"
                    checked={isHidden}
                    onChange={(e) => setIsHidden(e.target.checked)}
                    className="w-5 h-5 accent-[#5458A7] rounded"
                  />
                  <span>{t('sa_plans_hideToggle')}</span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-[#F0F2FA]">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow-sm"
                >
                  {t('common_saveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E4E6F3] rounded-[24px] sm:rounded-[28px] max-w-[calc(100vw-2rem)] sm:max-w-lg w-full p-5 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl sm:text-2xl font-extrabold font-sora text-[#23265A] mb-4">
              {t('sa_plans_addTitle')}
            </h3>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('sa_plans_name')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('sa_plans_namePh')}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] text-sm focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('sa_plans_priceMo')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    dir="ltr"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] text-sm text-start focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#23265A] mb-1">
                    {t('sa_plans_maxStudents')}
                  </label>
                  <input
                    type="number"
                    required
                    dir="ltr"
                    value={newStudentLimit}
                    onChange={(e) => setNewStudentLimit(parseInt(e.target.value) || 0)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] text-sm text-start focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#23265A] mb-1">
                  {t('sa_plans_features')}
                </label>
                <textarea
                  rows={4}
                  value={newFeaturesText}
                  onChange={(e) => setNewFeaturesText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5D7EE] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#5458A7]/20"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 min-h-[40px] cursor-pointer text-xs font-bold text-[#23265A]">
                  <input
                    type="checkbox"
                    checked={newIsPopular}
                    onChange={(e) => setNewIsPopular(e.target.checked)}
                    className="w-5 h-5 accent-[#5458A7] rounded"
                  />
                  <span>{t('sa_plans_popularToggleAdd')}</span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-[#F0F2FA]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-full border border-[#D5D7EE] text-xs font-bold text-[#6B7280] hover:bg-[#F3F4FB] cursor-pointer"
                >
                  {t('common_cancel')}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 rounded-full bg-[#5458A7] text-white text-xs font-bold hover:opacity-95 cursor-pointer shadow-sm"
                >
                  {t('sa_plans_createBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

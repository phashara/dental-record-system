import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles, Layers } from 'lucide-react';
import { COVERAGE_CATEGORIES, DentureRecord, resolveCoverage } from '../types';

interface CoverageSliderFilterProps {
  records: DentureRecord[];
  activeGroup: string; // 'all' or category name
  activeSubItem: string; // 'all' or sub-item name
  onChange: (group: string, subItem: string) => void;
}

export const CoverageSliderFilter: React.FC<CoverageSliderFilterProps> = ({
  records,
  activeGroup,
  activeSubItem,
  onChange,
}) => {
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const subScrollRef = useRef<HTMLDivElement>(null);

  // Compute counts for main categories
  const groupCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: records.length };
    COVERAGE_CATEGORIES.forEach(cat => {
      counts[cat.name] = 0;
    });

    records.forEach(r => {
      const resolved = resolveCoverage(r.coverage);
      const group = r.coverageGroup || resolved.group;
      if (counts[group] !== undefined) {
        counts[group] += 1;
      }
    });

    return counts;
  }, [records]);

  // Compute counts for sub-items in active category
  const activeCatObj = COVERAGE_CATEGORIES.find(c => c.name === activeGroup);

  const subItemCounts = React.useMemo(() => {
    if (!activeCatObj) return {};
    const counts: Record<string, number> = { all: groupCounts[activeCatObj.name] || 0 };
    activeCatObj.items.forEach(item => {
      counts[item] = 0;
    });

    records.forEach(r => {
      const resolved = resolveCoverage(r.coverage);
      const group = r.coverageGroup || resolved.group;
      if (group === activeCatObj.name) {
        const sub = resolved.subItem;
        if (counts[sub] !== undefined) {
          counts[sub] += 1;
        } else if (r.coverage && counts[r.coverage] !== undefined) {
          counts[r.coverage] += 1;
        }
      }
    });

    return counts;
  }, [records, activeCatObj, groupCounts]);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const offset = direction === 'left' ? -220 : 220;
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleSelectGroup = (groupName: string) => {
    if (groupName === 'all') {
      onChange('all', 'all');
    } else {
      onChange(groupName, 'all');
    }
  };

  const handleSelectSub = (subName: string) => {
    onChange(activeGroup, subName);
  };

  return (
    <div className="w-full space-y-2.5 p-3 sm:p-4 rounded-2xl bg-zinc-50/90 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800/80 transition-all">
      
      {/* Header Label & Active Status */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            สิทธิการรักษาพยาบาล (กดเลื่อนเพื่อดูประเภทย่อย)
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          {activeGroup === 'all' ? (
            <span>แสดงทุกสิทธิ ({records.length} รายการ)</span>
          ) : (
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {activeGroup} {activeSubItem !== 'all' && `▸ ${activeSubItem}`} ({activeSubItem === 'all' ? groupCounts[activeGroup] || 0 : subItemCounts[activeSubItem] || 0} รายการ)
            </span>
          )}
        </div>
      </div>

      {/* Main Categories Sliding Bar */}
      <div className="relative flex items-center group">
        <button
          type="button"
          onClick={() => scrollContainer(mainScrollRef, 'left')}
          className="hidden sm:flex absolute -left-2 z-10 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="เลื่อนซ้าย"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={mainScrollRef}
          className="w-full flex items-center space-x-2 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Option: All */}
          <button
            type="button"
            onClick={() => handleSelectGroup('all')}
            className={`shrink-0 flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeGroup === 'all'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm'
                : 'bg-white dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600'
            }`}
          >
            <span>ทั้งหมด (All)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeGroup === 'all'
                ? 'bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
            }`}>
              {groupCounts.all || 0}
            </span>
          </button>

          {/* 5 Main Categories */}
          {COVERAGE_CATEGORIES.map((cat, idx) => {
            const isSelected = activeGroup === cat.name;
            const count = groupCounts[cat.name] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectGroup(cat.name)}
                className={`shrink-0 flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <span>{idx + 1}. {cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollContainer(mainScrollRef, 'right')}
          className="hidden sm:flex absolute -right-2 z-10 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          title="เลื่อนขวา"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-Categories (ประเภทย่อย) Sliding Drawer */}
      {activeCatObj && (
        <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center space-x-1">
              <span>ประเภทย่อยในหมวด &ldquo;{activeCatObj.name}&rdquo;:</span>
            </span>
            <span className="text-[10px] text-zinc-400">
              เลื่อนซ้าย-ขวา เพื่อเลือก
            </span>
          </div>

          <div className="relative flex items-center group">
            <button
              type="button"
              onClick={() => scrollContainer(subScrollRef, 'left')}
              className="hidden sm:flex absolute -left-2 z-10 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 transition-colors"
              title="เลื่อนซ้าย"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div
              ref={subScrollRef}
              className="w-full flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth no-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* Option: All inside this category */}
              <button
                type="button"
                onClick={() => handleSelectSub('all')}
                className={`shrink-0 flex items-center space-x-1 px-3 py-1 rounded-xl text-[11px] font-medium transition-all ${
                  activeSubItem === 'all'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-bold'
                    : 'bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-transparent'
                }`}
              >
                <span>ทั้งหมดใน {activeCatObj.name}</span>
                <span className="text-[10px] opacity-75 font-mono">
                  ({subItemCounts.all || 0})
                </span>
              </button>

              {/* Sub items */}
              {activeCatObj.items.map(subItem => {
                const isSubSelected = activeSubItem === subItem;
                const count = subItemCounts[subItem] || 0;
                return (
                  <button
                    key={subItem}
                    type="button"
                    onClick={() => handleSelectSub(subItem)}
                    className={`shrink-0 flex items-center space-x-1.5 px-3 py-1 rounded-xl text-[11px] font-medium transition-all ${
                      isSubSelected
                        ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                        : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-600'
                    }`}
                  >
                    <span>{subItem}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSubSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollContainer(subScrollRef, 'right')}
              className="hidden sm:flex absolute -right-2 z-10 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 transition-colors"
              title="เลื่อนขวา"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

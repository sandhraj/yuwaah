import { useState, useRef, useCallback } from 'react';
import type { LocalState, Stage, Fear } from '../types';

interface FieldOpsPageProps {
  localState: LocalState;
  setLocalState: React.Dispatch<React.SetStateAction<LocalState>>;
  showToast: () => void;
}

export function FieldOpsPage({ localState, setLocalState, showToast }: FieldOpsPageProps) {
  const [openStages, setOpenStages] = useState<Record<number, boolean>>({});
  const [editingStage, setEditingStage] = useState<number | null>(null);
  const ownerRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const dropCauseRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const recoveryRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const roleNameRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const roleTypeRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const fearQRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const fearARefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  const dragSrc = useRef<{ si: number; ri: number } | null>(null);

  const save = useCallback(
    (updater: (prev: LocalState) => LocalState) => {
      setLocalState((prev) => {
        const next = updater(prev);
        try { localStorage.setItem('yw_ls', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      showToast();
    },
    [setLocalState, showToast]
  );

  const toggleStage = (i: number) => setOpenStages((prev) => ({ ...prev, [i]: !prev[i] }));

  const saveOwner = (si: number) => {
    const val = ownerRefs.current[si]?.value || '';
    save((prev) => {
      const stages = prev.stages.map((s, i) => (i === si ? { ...s, owner: val } : s));
      return { ...prev, stages };
    });
    setEditingStage(null);
  };

  const saveStageField = (si: number, field: keyof Stage, val: string) => {
    save((prev) => {
      const stages = prev.stages.map((s, i) => (i === si ? { ...s, [field]: val } : s));
      return { ...prev, stages };
    });
  };

  const addRole = (si: number) => {
    const name = roleNameRefs.current[si]?.value?.trim() || '';
    if (!name) return;
    const type = roleTypeRefs.current[si]?.value?.trim() || 'Team member';
    save((prev) => {
      const stages = prev.stages.map((s, i) =>
        i === si ? { ...s, roles: [...s.roles, { name, type }] } : s
      );
      return { ...prev, stages };
    });
    setOpenStages((prev) => ({ ...prev, [si]: true }));
    if (roleNameRefs.current[si]) roleNameRefs.current[si]!.value = '';
    if (roleTypeRefs.current[si]) roleTypeRefs.current[si]!.value = '';
  };

  const deleteRole = (si: number, ri: number) => {
    if (!confirm('Remove role?')) return;
    save((prev) => {
      const stages = prev.stages.map((s, i) =>
        i === si ? { ...s, roles: s.roles.filter((_, j) => j !== ri) } : s
      );
      return { ...prev, stages };
    });
    setOpenStages((prev) => ({ ...prev, [si]: true }));
  };

  const addFear = () => {
    save((prev) => ({
      ...prev,
      fears: [...prev.fears, { fear: 'New situation', response: 'Counsellor response here' }],
    }));
  };

  const saveFear = (fi: number) => {
    const fear = fearQRefs.current[fi]?.value || localState.fears[fi].fear;
    const response = fearARefs.current[fi]?.value || localState.fears[fi].response;
    save((prev) => {
      const fears = prev.fears.map((f, i) => (i === fi ? { fear, response } : f));
      return { ...prev, fears };
    });
  };

  const deleteFear = (fi: number) => {
    if (!confirm('Delete?')) return;
    save((prev) => ({ ...prev, fears: prev.fears.filter((_, i) => i !== fi) }));
  };

  const handleDragStart = (si: number, ri: number) => {
    dragSrc.current = { si, ri };
  };

  const handleDrop = (si: number, ri: number) => {
    if (!dragSrc.current || dragSrc.current.si !== si) return;
    const srcRi = dragSrc.current.ri;
    if (srcRi === ri) return;
    save((prev) => {
      const stages = prev.stages.map((s, i) => {
        if (i !== si) return s;
        const roles = [...s.roles];
        const [moved] = roles.splice(srcRi, 1);
        roles.splice(ri, 0, moved);
        return { ...s, roles };
      });
      return { ...prev, stages };
    });
    setOpenStages((prev) => ({ ...prev, [si]: true }));
    dragSrc.current = null;
  };

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-3.5">
          <div className="card-title mb-0">Stage owners & team roles</div>
          <span className="text-[11px] text-text-3">Drag ⠿ to reorder · ▸ to expand</span>
        </div>

        {localState.stages.map((s, si) => {
          const isOpen = openStages[si];
          const isEdit = editingStage === si;
          const bc = s.nudge ? 'border-nudge-border' : s.maybe ? 'border-[#C4A8E8]' : 'border-border';
          const hdBg = s.nudge ? 'bg-nudge-bg' : s.maybe ? 'bg-purple-bg' : 'bg-bg-2';

          return (
            <div key={si} className={`border rounded-lg mb-2 overflow-hidden ${bc}`}>
              <div
                className={`flex items-center gap-2 px-3.5 py-2.5 cursor-pointer ${hdBg}`}
                onClick={() => toggleStage(si)}
              >
                <span className="text-text-3">{isOpen ? '▾' : '▸'}</span>
                <span className="text-[13px] font-medium flex-1">
                  {s.label}
                  {s.nudge && <span className="badge badge-nudge ml-1">Nudgebay</span>}
                  {s.maybe && <span className="badge badge-maybe ml-1">Maybe</span>}
                </span>
                <span className="text-[11px] text-text-3">{s.roles.length} roles</span>
              </div>

              {isOpen && (
                <div className="px-3.5 py-3.5 border-t border-border">
                  <div className="text-[11px] text-text-2 mb-1">Stage owner</div>
                  <div className="mb-3">
                    {isEdit ? (
                      <div className="flex gap-1.5 items-start">
                        <input
                          className="input flex-1"
                          defaultValue={s.owner}
                          ref={(el) => { ownerRefs.current[si] = el; }}
                        />
                        <button className="btn btn-sm btn-primary" onClick={() => saveOwner(si)}>Save</button>
                        <button className="btn btn-sm" onClick={() => setEditingStage(null)}>Cancel</button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-bg-2 border border-border rounded-sm px-2.5 py-1 text-xs">
                        {s.owner}
                        <button
                          onClick={() => setEditingStage(si)}
                          className="border-none bg-transparent cursor-pointer text-text-2 text-xs"
                        >
                          ✎
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-text-2 mb-1">Roles</div>
                  <div className="flex flex-col gap-1 mb-2">
                    {s.roles.map((r, ri) => (
                      <div
                        key={ri}
                        className="role-row"
                        draggable
                        onDragStart={() => handleDragStart(si, ri)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(si, ri)}
                      >
                        <span className="text-text-3 text-sm flex-shrink-0">⠿</span>
                        <span className="flex-1 text-xs">{r.name}</span>
                        <span className="text-[10px] text-text-2 bg-white border border-border px-1.5 py-0.5 rounded-md">{r.type}</span>
                        <button className="btn btn-sm" onClick={() => {
                          const name = prompt('Name:', r.name);
                          if (name === null) return;
                          const type = prompt('Role type:', r.type);
                          if (type === null) return;
                          save((prev) => {
                            const stages = prev.stages.map((st, i) =>
                              i === si ? { ...st, roles: st.roles.map((ro, j) => j === ri ? { name: name.trim() || r.name, type: type.trim() || r.type } : ro) } : st
                            );
                            return { ...prev, stages };
                          });
                          setOpenStages((prev) => ({ ...prev, [si]: true }));
                        }}>Edit</button>
                        <button className="btn btn-sm text-red-custom border-[#f09595]" onClick={() => deleteRole(si, ri)}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    <input className="input" placeholder="Name" style={{ width: 110 }} ref={(el) => { roleNameRefs.current[si] = el; }} />
                    <input className="input" placeholder="Role type" style={{ width: 140 }} ref={(el) => { roleTypeRefs.current[si] = el; }} />
                    <button className="btn btn-sm btn-primary" onClick={() => addRole(si)}>+ Add</button>
                  </div>

                  <div className="border-t border-border pt-3">
                    <div className="text-[11px] text-text-2 mb-1">Primary dropout cause</div>
                    <div className="flex gap-1.5 items-start mb-2">
                      <input
                        className="input flex-1 text-[11px]"
                        defaultValue={s.dropCause || ''}
                        ref={(el) => { dropCauseRefs.current[si] = el; }}
                      />
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => saveStageField(si, 'dropCause', dropCauseRefs.current[si]?.value || '')}
                      >
                        Save
                      </button>
                    </div>
                    <div className="text-[11px] text-text-2 mb-1 mt-2.5">Recovery action</div>
                    <div className="flex gap-1.5 items-start">
                      <textarea
                        className="input flex-1 text-[11px] min-h-[42px]"
                        defaultValue={s.recovery || ''}
                        ref={(el) => { recoveryRefs.current[si] = el; }}
                      />
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => saveStageField(si, 'recovery', recoveryRefs.current[si]?.value || '')}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title mb-0">Dropout & fear response framework</div>
          <button className="btn btn-sm btn-primary" onClick={addFear}>+ Add</button>
        </div>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="text-left p-1.5 px-2 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase w-[38%]">Situation / fear stated</th>
              <th className="text-left p-1.5 px-2 text-[10px] font-semibold tracking-[0.05em] text-text-3 border-b border-border uppercase">Counsellor response</th>
              <th className="border-b border-border w-9"></th>
            </tr>
          </thead>
          <tbody>
            {localState.fears.map((f: Fear, fi: number) => (
              <tr key={fi}>
                <td className="p-1.5 px-2 border-b border-border align-top">
                  <div className="flex gap-1.5 items-start">
                    <input
                      className="input flex-1 text-[11px]"
                      defaultValue={f.fear}
                      ref={(el) => { fearQRefs.current[fi] = el; }}
                    />
                    <button className="btn btn-sm btn-primary" onClick={() => saveFear(fi)}>Save</button>
                  </div>
                </td>
                <td className="p-1.5 px-2 border-b border-border align-top">
                  <textarea
                    className="input text-[11px] min-h-[38px] w-full"
                    defaultValue={f.response}
                    ref={(el) => { fearARefs.current[fi] = el; }}
                  />
                </td>
                <td className="p-1.5 px-2 border-b border-border align-top">
                  <button className="btn btn-sm text-red-custom border-[#f09595]" onClick={() => deleteFear(fi)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

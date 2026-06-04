import { useEffect, useState } from "react";
import { api, inr, formatErr } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "Cashier", phone: "", monthly_salary: 20000 });
  const period = monthKey();

  const load = async () => {
    const [e, p] = await Promise.all([api.get("/employees"), api.get("/payroll")]);
    setEmployees(e.data);
    setPayroll(p.data);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await api.post("/employees", { ...form, monthly_salary: Number(form.monthly_salary) });
      toast.success("Employee added");
      setOpen(false);
      setForm({ name: "", role: "Cashier", phone: "", monthly_salary: 20000 });
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove employee?")) return;
    try {
      await api.delete(`/employees/${id}`);
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const pay = async (emp) => {
    try {
      await api.post(`/employees/${emp.id}/pay`, { period, note: `Salary ${period}` });
      toast.success(`Paid ${emp.name} · ${inr(emp.monthly_salary)}`);
      load();
    } catch (e) {
      toast.error(formatErr(e));
    }
  };

  const isPaidThisMonth = (eid) =>
    payroll.some((p) => p.employee_id === eid && p.period === period);

  const totalThisMonth = payroll
    .filter((p) => p.period === period)
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-8 lg:p-12" data-testid="employees-page">
      <PageHeader
        eyebrow="Team"
        title="Employees & Salaries"
        subtitle={`Pay your bakers and cashiers monthly. Period: ${period}.`}
        right={
          <button
            onClick={() => setOpen(true)}
            data-testid="add-employee-button"
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add employee
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Stat label="Headcount" value={employees.length} />
        <Stat label="Monthly payroll" value={inr(employees.reduce((s, e) => s + e.monthly_salary, 0))} />
        <Stat label={`Paid in ${period}`} value={inr(totalThisMonth)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {employees.map((e) => {
          const paid = isPaidThisMonth(e.id);
          return (
            <div
              key={e.id}
              data-testid={`employee-card-${e.id}`}
              className="card-luxe p-5 fade-up"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-serif-display text-2xl" style={{ color: "#2c1b18" }}>
                    {e.name}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-[#8B0000] font-semibold mt-1">
                    {e.role}
                  </div>
                  {e.phone && (
                    <div className="text-xs text-[#5a3a31] mt-1">📞 {e.phone}</div>
                  )}
                </div>
                <button
                  onClick={() => remove(e.id)}
                  className="text-[#8B0000] p-1.5 hover:bg-[rgba(139,0,0,0.06)] rounded-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-4 pt-4 border-t border-[rgba(139,0,0,0.1)]">
                <div className="text-xs text-[#5a3a31] mb-1">Monthly Salary</div>
                <div className="font-serif-display text-3xl" style={{ color: "#8B0000" }}>
                  {inr(e.monthly_salary)}
                </div>
              </div>
              {paid ? (
                <div
                  className="mt-4 px-3 py-2 text-sm bg-[rgba(46,111,64,0.1)] text-[#2e6f40] rounded-sm font-semibold flex items-center gap-2"
                  data-testid={`paid-badge-${e.id}`}
                >
                  ✓ Paid for {period}
                </div>
              ) : (
                <button
                  onClick={() => pay(e)}
                  data-testid={`pay-employee-${e.id}`}
                  className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
                >
                  <Wallet size={14} /> Pay {inr(e.monthly_salary)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="card-luxe mt-10 p-6">
        <div className="label-eyebrow">History</div>
        <h3 className="font-serif-display text-2xl mt-1 mb-4" style={{ color: "#2c1b18" }}>
          Payroll Ledger
        </h3>
        {payroll.length === 0 ? (
          <div className="text-sm text-[#5a3a31]">No payments yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[#5a3a31]">
              <tr className="text-left">
                <th className="py-2 text-xs uppercase tracking-wider">Date</th>
                <th className="py-2 text-xs uppercase tracking-wider">Employee</th>
                <th className="py-2 text-xs uppercase tracking-wider">Period</th>
                <th className="py-2 text-xs uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payroll.map((p) => (
                <tr key={p.id} className="border-t border-[rgba(139,0,0,0.08)]">
                  <td className="py-2 text-[#5a3a31]">{new Date(p.paid_at).toLocaleDateString()}</td>
                  <td className="py-2">{p.employee_name}</td>
                  <td className="py-2">{p.period}</td>
                  <td className="py-2 text-right font-medium">{inr(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif-display text-2xl">Add employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              data-testid="employee-name-input"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
            />
            <input
              placeholder="Role (e.g. Baker, Cashier)"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="form-input"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="form-input"
            />
            <input
              type="number"
              placeholder="Monthly salary (₹)"
              value={form.monthly_salary}
              onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
              className="form-input"
            />
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="btn-outline">
              Cancel
            </button>
            <button data-testid="save-employee-button" onClick={create} className="btn-primary">
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style>{`.form-input{width:100%;padding:.5rem .75rem;background:#fff;border:1px solid rgba(139,0,0,.2);border-radius:4px;font-size:.875rem;outline:none}.form-input:focus{border-color:#8B0000;box-shadow:0 0 0 1px #8B0000}`}</style>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div className="card-luxe p-5">
    <div className="label-eyebrow">{label}</div>
    <div className="font-serif-display text-3xl mt-2" style={{ color: "#2c1b18" }}>
      {value}
    </div>
  </div>
);

import { useState } from 'react';
import { Database } from 'lucide-react';
import { useStore } from '../store';
import { Button, Heading, Modal, Panel } from '../ui';

const packages = [
  { name: 'Старт', amount: 10000, price: 490 },
  { name: 'Оптимальный', amount: 50000, price: 1490 },
  { name: 'Для команды', amount: 100000, price: 2490 },
];
const number = (value: number) => value.toLocaleString('ru-RU');
const money = (value: number) => `${number(value)} ₽`;

export function Tokens() {
  const { db, update, toast } = useStore();
  const [selected, setSelected] = useState(1);
  const [method, setMethod] = useState<'card' | 'sbp'>('card');
  const [payment, setPayment] = useState(false);
  const pack = packages[selected];
  return (
    <div className="account-page tokens-page">
      <Heading title="Токены и оплата" sub="Единый баланс для всех проектов аккаунта" />
      <Panel className="account-token-balance">
        <span className="token-balance-icon">
          <Database size={32} strokeWidth={1.5} />
        </span>
        <div>
          <p className="small">Доступно на аккаунте</p>
          <div className="token-balance-value">
            <strong>{number(db.balance)}</strong>
            <span className="muted">токенов</span>
          </div>
        </div>
      </Panel>
      <div className="token-purchase-grid">
        <Panel className="token-packages-panel">
          <h2>Выберите пакет</h2>
          <p className="small muted">Разовое пополнение без подписки</p>
          <div className="token-package-options" role="radiogroup" aria-label="Пакет токенов">
            {packages.map((p, i) => (
              <button
                type="button"
                role="radio"
                aria-checked={selected === i}
                className={`token-package ${selected === i ? 'selected' : ''}`}
                key={p.name}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => {
                  if (
                    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                      e.key,
                    )
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === 'Home'
                        ? 0
                        : e.key === 'End'
                          ? packages.length - 1
                          : (i +
                              (['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1) +
                              packages.length) %
                            packages.length;
                    setSelected(next);
                    (e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();
                  }
                }}
                tabIndex={selected === i ? 0 : -1}
              >
                <span className="package-name">{p.name}</span>
                <strong className="package-amount">{number(p.amount)}</strong>
                <span className="muted">токенов</span>
                <strong className="package-price">{money(p.price)}</strong>
                <span className={selected === i ? 'accent' : 'muted'}>
                  {selected === i ? 'Выбрано' : 'Выбрать'}
                </span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="token-payment-panel">
          <h2>Оплата</h2>
          <div className="payment-summary">
            <strong>Пакет «{pack.name}»</strong>
            <span className="small muted">{number(pack.amount)} токенов</span>
          </div>
          <div className="payment-total">
            <span>К оплате</span>
            <strong>{money(pack.price)}</strong>
          </div>
          <div className="payment-methods" role="radiogroup" aria-label="Способ оплаты">
            {(
              [
                ['card', 'Карта'],
                ['sbp', 'СБП'],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                role="radio"
                aria-checked={method === value}
                key={value}
                className={`button ${method === value ? 'dark' : 'secondary'}`}
                onClick={() => setMethod(value)}
                tabIndex={method === value ? 0 : -1}
                onKeyDown={(e) => {
                  if (
                    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                      e.key,
                    )
                  ) {
                    e.preventDefault();
                    const next =
                      e.key === 'Home'
                        ? 'card'
                        : e.key === 'End'
                          ? 'sbp'
                          : method === 'card'
                            ? 'sbp'
                            : 'card';
                    setMethod(next);
                    (
                      e.currentTarget.parentElement?.children[
                        next === 'card' ? 0 : 1
                      ] as HTMLButtonElement
                    )?.focus();
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <Button className="payment-submit" onClick={() => setPayment(true)}>
            Перейти к оплате
          </Button>
          <p className="small muted">Демо: платёж не производится.</p>
        </Panel>
      </div>
      <p className="token-prices-hint small muted">Цены указаны для примера.</p>
      <Panel className="payment-history-panel">
        <h2>История пополнений</h2>
        <div className="table-scroll">
          <table className="payment-history-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Операция</th>
                <th>Токены</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {db.transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.text}</td>
                  <td>+{number(t.amount)}</td>
                  <td>{t.price === undefined ? '—' : money(t.price)}</td>
                  <td className="positive">{t.demo ? 'Демо' : 'Записано'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!db.transactions.length && <p className="muted">Пополнений пока нет</p>}
      </Panel>
      {payment && (
        <Modal title="Демонстрация оплаты" onClose={() => setPayment(false)}>
          <p>
            Пакет «{pack.name}» — {number(pack.amount)} токенов за {money(pack.price)}.
          </p>
          <p className="muted">
            Способ: {method === 'card' ? 'банковская карта' : 'СБП'}. Реальный платёж не
            производится. Можно начислить тестовые токены на весь аккаунт.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setPayment(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (
                  update((d) => {
                    d.balance += pack.amount;
                    d.transactions.unshift({
                      id: crypto.randomUUID(),
                      text: `Пакет «${pack.name}»`,
                      amount: pack.amount,
                      price: pack.price,
                      method,
                      demo: true,
                      date: new Date().toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    });
                  })
                ) {
                  setPayment(false);
                  toast('Тестовые токены начислены на аккаунт');
                }
              }}
            >
              Начислить тестовые токены
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

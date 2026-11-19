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
    <div className="account-page tokens">
      <Heading title="Токены и оплата" sub="Единый баланс для всех проектов аккаунта" />
      <Panel className="tokens__balance">
        <span className="tokens__balance-icon">
          <Database size={32} strokeWidth={1.5} />
        </span>
        <div>
          <p className="text text--small">Доступно на аккаунте</p>
          <div className="tokens__balance-value">
            <strong>{number(db.balance)}</strong>
            <span className="text text--muted">токенов</span>
          </div>
        </div>
      </Panel>
      <div className="tokens__purchase">
        <Panel className="tokens__packages">
          <h2>Выберите пакет</h2>
          <p className="text text--small text--muted">Разовое пополнение без подписки</p>
          <div className="tokens__options" role="radiogroup" aria-label="Пакет токенов">
            {packages.map((p, i) => (
              <button
                type="button"
                role="radio"
                aria-checked={selected === i}
                className={`token-package ${selected === i ? 'token-package--selected' : ''}`}
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
                <span className="token-package__name">{p.name}</span>
                <strong className="token-package__amount">{number(p.amount)}</strong>
                <span className="text text--muted">токенов</span>
                <strong className="token-package__price">{money(p.price)}</strong>
                <span className={selected === i ? 'text text--accent' : 'text text--muted'}>
                  {selected === i ? 'Выбрано' : 'Выбрать'}
                </span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="payment">
          <h2>Оплата</h2>
          <div className="payment__summary">
            <strong>Пакет «{pack.name}»</strong>
            <span className="text text--small text--muted">{number(pack.amount)} токенов</span>
          </div>
          <div className="payment__total">
            <span>К оплате</span>
            <strong>{money(pack.price)}</strong>
          </div>
          <div className="payment__methods" role="radiogroup" aria-label="Способ оплаты">
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
                className={`button ${method === value ? 'button--dark' : 'button--secondary'}`}
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
          <Button className="payment__submit" onClick={() => setPayment(true)}>
            Перейти к оплате
          </Button>
          <p className="text text--small text--muted">Демо: платёж не производится.</p>
        </Panel>
      </div>
      <p className="tokens__prices-hint text text--small text--muted">Цены указаны для примера.</p>
      <Panel className="payment-history">
        <h2>История пополнений</h2>
        <div className="data-table__scroll">
          <table className="payment-history__table">
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
                  <td className="text text--positive">{t.demo ? 'Демо' : 'Записано'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!db.transactions.length && <p className="text text--muted">Пополнений пока нет</p>}
      </Panel>
      {payment && (
        <Modal title="Демонстрация оплаты" onClose={() => setPayment(false)}>
          <p>
            Пакет «{pack.name}» — {number(pack.amount)} токенов за {money(pack.price)}.
          </p>
          <p className="text text--muted">
            Способ: {method === 'card' ? 'банковская карта' : 'СБП'}. Реальный платёж не
            производится. Можно начислить тестовые токены на весь аккаунт.
          </p>
          <div className="modal__actions">
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

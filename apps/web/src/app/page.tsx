import Link from 'next/link';
import { PublicThemeToggle } from './public-theme-toggle';
import styles from './page.module.css';

const systemAreas = [
  {
    title: 'Sales',
    text: 'Create sales, track paid and unpaid orders, and keep daily shop movement clear.',
  },
  {
    title: 'Products',
    text: 'Manage clothes, shoes, handbags, accessories, retail prices, and wholesale prices.',
  },
  {
    title: 'Stock',
    text: 'Know what is available, what is running low, and what needs to be added.',
  },
];

const developerPhoneDisplay = '+250 785 587 830';
const developerPhoneHref = 'tel:+250785587830';

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Sisters Fashion Shop home">
          <span className={styles.logo}>LE</span>
          <span>
            <span className={styles.brandTop}>Sisters Fashion</span>
            <span className={styles.brandName}>Boutique</span>
          </span>
        </Link>

        <div className={styles.headerActions}>
          <PublicThemeToggle />
          <Link href="/login" className={styles.ownerAccess}>
            Sign in
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <p className={styles.kicker}>Internal shop system</p>
        <h1>Run Sisters Fashion Shop with clear sales, stock, and money records.</h1>
        <p className={styles.heroText}>
          This system is made for the owner and employees to manage products,
          retail and wholesale prices, sales, customers, stock, expenses, and reports.
        </p>

        <div className={styles.heroActions}>
          <Link href="/login" className={styles.primaryButton}>
            Enter shop system
          </Link>
        </div>

        <div className={styles.heroStrip} aria-label="System highlights">
          <span>Owner access</span>
          <span>Employee access</span>
          <span>Retail and wholesale</span>
          <span>Daily records</span>
        </div>
      </section>

      <section className={styles.collections}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>What it helps with</p>
          <h2>Everything the shop needs to stay organized.</h2>
          <p>
            A simple internal tool for keeping the boutique’s daily work clear,
            from product entry to stock checks and sales records.
          </p>
        </div>

        <div className={styles.categoryGrid}>
          {systemAreas.map((area) => (
            <article key={area.title} className={styles.categoryCard}>
              <span />
              <h3>{area.title}</h3>
              <p>{area.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.visit}>
        <div className={styles.visitContent}>
          <p className={styles.kicker}>Owner and employee access</p>
          <h2>Sign in to manage today’s shop work.</h2>
          <p>
            Use this system to record sales, check products, update stock, follow
            customer debts, and understand how the boutique is doing.
          </p>
        </div>

        <div className={styles.contactPanel}>
          <span>Private system</span>
          <strong>For Sisters Fashion Shop staff only</strong>
          <p>
            Customers should not use this page. Only the shop owner and approved
            employees should sign in.
          </p>
          <Link href="/login" className={styles.panelButton}>
            Sign in
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© {year} Sisters Fashion Shop. All rights reserved.</p>
        <p>
          Developed by{' '}
          <a href="https://webimpactlab.com" target="_blank" rel="noreferrer">
            WebImpact Lab
          </a>
        </p>
        <p>
          Developer contact:{' '}
          <a href={developerPhoneHref}>
            {developerPhoneDisplay}
          </a>
        </p>
      </footer>
    </main>
  );
}

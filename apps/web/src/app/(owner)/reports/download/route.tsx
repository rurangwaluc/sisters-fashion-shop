import { requireOwner } from '@/lib/auth/session';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import { cleanReportDate, cleanReportRange, getReport, money } from '@/lib/reports/report-data';

export const runtime = 'nodejs';

type ReportPdfProps = {
  report: Awaited<ReturnType<typeof getReport>>;
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    backgroundColor: '#FAFAFC',
    color: '#222222',
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#222222',
    color: '#ffffff',
    padding: 18,
    marginBottom: 16,
  },
  eyebrow: {
    color: '#FF6FB2',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 5,
  },
  subtitle: {
    color: '#D1D5DB',
    fontSize: 10,
  },
  section: {
    backgroundColor: '#ffffff',
    border: '1 solid #E5E7EB',
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  card: {
    width: '23.5%',
    backgroundColor: '#ffffff',
    border: '1 solid #E5E7EB',
    padding: 10,
  },
  label: {
    fontSize: 7,
    color: '#6B7280',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    fontWeight: 700,
  },
  helper: {
    color: '#6B7280',
    fontSize: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1 solid #E5E7EB',
    paddingVertical: 7,
    alignItems: 'center',
  },
  rowLast: {
    flexDirection: 'row',
    paddingVertical: 7,
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontWeight: 700,
  },
  small: {
    color: '#6B7280',
    fontSize: 8,
    marginTop: 2,
  },
  amount: {
    width: 120,
    textAlign: 'right',
    fontWeight: 700,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  empty: {
    color: '#6B7280',
    fontSize: 9,
  },
  footer: {
    color: '#6B7280',
    fontSize: 8,
    marginTop: 8,
    textAlign: 'center',
  },
});

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

function MoneyRows({ rows }: { rows: { name: string; total: number }[] }) {
  return (
    <View>
      {rows.map((row, index) => (
        <View key={row.name} style={index === rows.length - 1 ? styles.rowLast : styles.row}>
          <Text style={styles.name}>{row.name}</Text>
          <Text style={styles.amount}>{money(row.total)}</Text>
        </View>
      ))}
    </View>
  );
}

function ProductRows({
  rows,
}: {
  rows: { name: string; quantity: number; total: number; profit: number }[];
}) {
  if (rows.length === 0) {
    return <Text style={styles.empty}>No products sold in this period.</Text>;
  }

  return (
    <View>
      {rows.map((row, index) => (
        <View key={row.name} style={index === rows.length - 1 ? styles.rowLast : styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{row.name}</Text>
            <Text style={styles.small}>
              Quantity: {row.quantity} / Profit: {money(row.profit)}
            </Text>
          </View>
          <Text style={styles.amount}>{money(row.total)}</Text>
        </View>
      ))}
    </View>
  );
}

function ReportPdf({ report }: ReportPdfProps) {
  const summary = [
    { label: 'Sales total', value: money(report.summary.salesTotal), helper: 'Total sold' },
    { label: 'Money received', value: money(report.summary.moneyReceived), helper: 'Sales + debts paid' },
    { label: 'Unpaid', value: money(report.summary.creditGiven), helper: 'Still owed' },
    { label: 'Gross profit', value: money(report.summary.grossProfit), helper: 'Before expenses' },
    { label: 'Expenses', value: money(report.summary.expensesTotal), helper: 'Money spent' },
    { label: 'Net profit', value: money(report.summary.netProfit), helper: 'After expenses' },
    { label: 'Stock value', value: money(report.summary.stockValue), helper: 'Current stock value' },
    { label: 'Cash expected', value: money(report.summary.cashDrawerExpected), helper: report.openDrawer ? 'Open drawer' : 'No open drawer' },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Sisters Fashion Shop report</Text>
          <Text style={styles.title}>{report.period.title}</Text>
          <Text style={styles.subtitle}>{report.period.label}</Text>
        </View>

        <View style={styles.grid}>
          {summary.map((item) => (
            <SummaryCard
              key={item.label}
              label={item.label}
              value={item.value}
              helper={item.helper}
            />
          ))}
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Money received by method</Text>
              <MoneyRows rows={report.paymentRows.map((row) => ({ name: row.name, total: row.total }))} />
            </View>
          </View>

          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profit breakdown</Text>
              <MoneyRows
                rows={[
                  { name: 'Gross profit', total: report.summary.grossProfit },
                  { name: 'Expenses', total: report.summary.expensesTotal },
                  { name: 'Net profit', total: report.summary.netProfit },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top products sold</Text>
              <ProductRows rows={report.productRows} />
            </View>
          </View>

          <View style={styles.column}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Expenses by category</Text>
              {report.expenseCategoryRows.length === 0 ? (
                <Text style={styles.empty}>No expenses in this period.</Text>
              ) : (
                <MoneyRows
                  rows={report.expenseCategoryRows.map((row) => ({
                    name: row.category,
                    total: row.total,
                  }))}
                />
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products to restock</Text>
          {report.lowStock.length === 0 ? (
            <Text style={styles.empty}>No low stock products.</Text>
          ) : (
            report.lowStock.map((product, index) => (
              <View
                key={product.id}
                style={index === report.lowStock.length - 1 ? styles.rowLast : styles.row}
              >
                <Text style={styles.name}>{product.name}</Text>
                <Text style={styles.amount}>
                  {product.quantity} {product.unit}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer}>
          Generated by Sisters Fashion Shop / {new Date().toLocaleDateString('en-US')}
        </Text>
      </Page>
    </Document>
  );
}

export async function GET(request: Request) {
  await requireOwner();

  const url = new URL(request.url);
  const selectedDate = cleanReportDate(url.searchParams.get('date'));
  const selectedRange = cleanReportRange(url.searchParams.get('range'));
  const mode = url.searchParams.get('mode') === 'inline' ? 'inline' : 'attachment';
  const report = await getReport(selectedDate, selectedRange);

  const pdf = await renderToBuffer(<ReportPdf report={report} />);
  const filename = `sisters-fashion-shop-${selectedRange}-report-${selectedDate}.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${mode}; filename="${filename}"`,
    },
  });
}

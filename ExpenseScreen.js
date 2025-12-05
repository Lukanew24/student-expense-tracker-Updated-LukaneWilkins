import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

// Color palette
const COLORS = {
  darkBrown: '#3E2723',
  sandBrown: '#D7CCC8',
  accentBrown: '#8D6E63',
  lightSand: '#EFEBE9',
  darkText: '#1B0000',
  pieChartColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'],
};

export default function ExpenseScreen() {
  const db = useSQLiteContext();

  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  const loadExpenses = async () => {
    const rows = await db.getAllAsync(
      'SELECT * FROM expenses ORDER BY id DESC;'
    );
    setExpenses(rows);
  };

  const addExpense = async () => {
    const amountNumber = parseFloat(amount);

    if (isNaN(amountNumber) || amountNumber <= 0) {
      return;
    }

    const trimmedCategory = category.trim();
    const trimmedNote = note.trim();

    if (!trimmedCategory) {
      return;
    }

    await db.runAsync(
      'INSERT INTO expenses (amount, category, note) VALUES (?, ?, ?);',
      [amountNumber, trimmedCategory, trimmedNote || null]
    );

    setAmount('');
    setCategory('');
    setNote('');

    loadExpenses();
  };

  const deleteExpense = async (id) => {
    await db.runAsync('DELETE FROM expenses WHERE id = ?;', [id]);
    loadExpenses();
  };

  const renderExpense = ({ item }) => (
    <View style={styles.expenseRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.expenseAmount}>${Number(item.amount).toFixed(2)}</Text>
        <Text style={styles.expenseCategory}>{item.category}</Text>
        {item.note ? <Text style={styles.expenseNote}>{item.note}</Text> : null}
      </View>

      <TouchableOpacity onPress={() => deleteExpense(item.id)}>
        <Text style={styles.delete}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  // --------------------------
  // CATEGORY TOTALS FOR PIE CHART
  // --------------------------
  const getCategoryTotals = () => {
    const totals = {};

    expenses.forEach((exp, index) => {
      const category = exp.category || "Other";
      const amount = exp.amount || 0;

      if (!totals[category]) totals[category] = 0;
      totals[category] += amount;
    });

    return Object.entries(totals).map(([category, total], index) => ({
      name: category,
      amount: total,
      color: COLORS.pieChartColors[index % COLORS.pieChartColors.length],
      legendFontColor: COLORS.darkText,
      legendFontSize: 14,
    }));
  };

  useEffect(() => {
    async function setup() {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          note TEXT
        );
      `);

      await loadExpenses();
    }

    setup();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Student Expense Tracker</Text>

      {/* PIE CHART SECTION */}
      {expenses.length > 0 ? (
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.chartTitle}>Spending by Category</Text>

          <PieChart
            data={getCategoryTotals()}
            width={Dimensions.get('window').width - 20}
            height={220}
            chartConfig={{
              backgroundColor: COLORS.sandBrown,
              backgroundGradientFrom: COLORS.sandBrown,
              backgroundGradientTo: COLORS.sandBrown,
              decimalPlaces: 2,
              color: () => COLORS.darkBrown,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="10"
            absolute
          />
        </View>
      ) : null}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g. 12.50)"
          placeholderTextColor={COLORS.accentBrown}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (Food, Books, Rent...)"
          placeholderTextColor={COLORS.accentBrown}
          value={category}
          onChangeText={setCategory}
        />
        <TextInput
          style={styles.input}
          placeholder="Note (optional)"
          placeholderTextColor={COLORS.accentBrown}
          value={note}
          onChangeText={setNote}
        />
        <Button title="Add Expense" onPress={addExpense} color={COLORS.accentBrown} />
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpense}
        ListEmptyComponent={
          <Text style={styles.empty}>No expenses yet.</Text>
        }
      />

      <Text style={styles.footer}>
        Enter your expenses and they'll be saved locally with SQLite.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.darkBrown },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.sandBrown,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    color: COLORS.darkText,
    textAlign: 'center',
    marginBottom: 8,
  },
  form: {
    marginBottom: 16,
    gap: 8,
  },
  input: {
    padding: 10,
    backgroundColor: COLORS.lightSand,
    color: COLORS.darkBrown,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accentBrown,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentBrown,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.sandBrown,
  },
  expenseCategory: {
    fontSize: 14,
    color: COLORS.lightSand,
  },
  expenseNote: {
    fontSize: 12,
    color: COLORS.sandBrown,
  },
  delete: {
    color: '#FF6B6B',
    fontSize: 20,
    marginLeft: 12,
  },
  empty: {
    color: COLORS.sandBrown,
    marginTop: 24,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    color: COLORS.accentBrown,
    marginTop: 12,
    fontSize: 12,
  },
});
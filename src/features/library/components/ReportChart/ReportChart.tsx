'use client';

import { useId, useState } from 'react';
import { SimpleBarChart } from '@carbon/charts-react';
import { ChartTheme, ScaleTypes, type BarChartOptions } from '@carbon/charts';
import '@carbon/charts-react/styles.css';
import { Button } from '@carbon/react';
import { DataTable as DataTableIcon } from '@carbon/icons-react';
import { useThemePreference } from '@/providers/ThemeProvider';
import type { Chart } from '../../model/report.schema';
import styles from './ReportChart.module.scss';

/**
 * Horizontal Carbon bar chart for report figures. Carbon Charts' own toolbar nests
 * interactive controls (an axe violation), so it's off and we offer the data as a table.
 */
export function ReportChart({ chart, caption }: { chart: Chart; caption?: string }) {
  const { theme } = useThemePreference();
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();
  const options: BarChartOptions = {
    title: chart.title,
    axes: {
      left: { mapsTo: 'group', scaleType: ScaleTypes.LABELS },
      bottom: { mapsTo: 'value', title: chart.unit },
    },
    height: '240px',
    theme: theme === 'g100' ? ChartTheme.G100 : ChartTheme.WHITE,
    legend: { enabled: false },
    toolbar: { enabled: false },
  };
  return (
    <figure className={styles.root}>
      <SimpleBarChart
        data={chart.points.map((point) => ({ group: point.label, value: point.value }))}
        options={options}
      />
      <div className={styles.footer}>
        {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
        <Button
          kind="ghost"
          size="sm"
          renderIcon={DataTableIcon}
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((shown) => !shown)}
        >
          {showTable ? 'Hide data' : 'Show data as a table'}
        </Button>
      </div>
      <table id={tableId} className={showTable ? styles.table : styles.hidden}>
        <caption className={styles.tableCaption}>{chart.title}</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" className={styles.numeric}>
              Value ({chart.unit})
            </th>
          </tr>
        </thead>
        <tbody>
          {chart.points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td className={styles.numeric}>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

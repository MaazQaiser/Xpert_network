'use client';

import { useState, type ReactNode } from 'react';
import {
  Accordion,
  AccordionItem,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Checkbox,
  CheckboxGroup,
  CodeSnippet,
  ContentSwitcher,
  Dropdown,
  IconButton,
  InlineLoading,
  InlineNotification,
  Layer,
  Link,
  Modal,
  NumberInput,
  ProgressBar,
  ProgressIndicator,
  ProgressStep,
  RadioButton,
  RadioButtonGroup,
  Search,
  Select,
  SelectItem,
  SkeletonPlaceholder,
  SkeletonText,
  Slider,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TextArea,
  TextInput,
  Tile,
  Toggle,
} from '@carbon/react';
import { Add, Download, Filter, TrashCan } from '@carbon/icons-react';
import { Magnify } from '@carbon/pictograms-react';
import { AIExplainLabel } from '@/shared/ai';
import { EmptyState, ErrorState, StatusTag, type StatusTone } from '@/shared/ui';
import { COMPONENT_CONTROLS } from '../../model/controls';
import { TokenControlsPanel, useDesignSystemTheme } from './TokenControls';
import styles from './DesignSystemView.module.scss';

function Specimen({
  id,
  title,
  source,
  description,
  children,
}: {
  id: string;
  title: string;
  source: string;
  description: string;
  children: ReactNode;
}) {
  const theme = useDesignSystemTheme();
  const controls = COMPONENT_CONTROLS[id];

  return (
    <section className={styles.section} aria-labelledby={`component-${id}`}>
      <div className={styles.specimenHeader}>
        <h2 id={`component-${id}`} className={styles.sectionTitle}>
          {title}
        </h2>
        <code className={styles.tokenName}>{source}</code>
      </div>
      <p className={styles.sectionText}>{description}</p>
      {controls ? (
        <TokenControlsPanel controls={controls} theme={theme} title="Edit this component" compact />
      ) : null}
      <div className={styles.specimen}>{children}</div>
    </section>
  );
}

const STATUS_TONES: { tone: StatusTone; label: string }[] = [
  { tone: 'neutral', label: 'Draft' },
  { tone: 'info', label: 'Quote sent' },
  { tone: 'progress', label: 'In research' },
  { tone: 'success', label: 'Delivered' },
  { tone: 'warning', label: 'Low credits' },
  { tone: 'error', label: 'Rejected' },
];

const MARKETS = ['Riyadh', 'Dubai', 'Karachi', 'Cairo'];

const REPORTS = [
  {
    id: 'r1',
    title: 'Qahwa House: Riyadh expansion',
    experts: 6,
    status: 'success',
    label: 'Delivered',
  },
  {
    id: 'r2',
    title: 'Bayt Burger: franchise economics',
    experts: 4,
    status: 'progress',
    label: 'In research',
  },
  { id: 'r3', title: 'Gulf cold-chain logistics', experts: 3, status: 'info', label: 'Quote sent' },
] as const;

/** Every Carbon and Xpert Network component the app uses, rendered with the live theme. */
export function ComponentGallery() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={styles.sections}>
      <Specimen
        id="buttons"
        title="Buttons"
        source="@carbon/react · Button, IconButton"
        description="One primary per region; primary sits on the right in footers. Danger actions confirm first."
      >
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button kind="secondary">Secondary</Button>
          <Button kind="tertiary">Tertiary</Button>
          <Button kind="ghost">Ghost</Button>
          <Button kind="danger" renderIcon={TrashCan}>
            Delete
          </Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className={styles.row}>
          <Button size="sm" renderIcon={Add}>
            Small
          </Button>
          <Button size="md" renderIcon={Add}>
            Medium
          </Button>
          <Button size="lg" renderIcon={Add}>
            Large
          </Button>
          <IconButton kind="ghost" label="Download report">
            <Download />
          </IconButton>
          <IconButton kind="tertiary" label="Filter">
            <Filter />
          </IconButton>
        </div>
      </Specimen>

      <Specimen
        id="fields"
        title="Form fields"
        source="@carbon/react · TextInput, TextArea, Select, Dropdown, NumberInput, Search"
        description="Labels above, helper text below, validation on blur. Never placeholder as label."
      >
        <Layer>
          <div className={styles.fieldGrid}>
            <TextInput
              id="ds-company"
              labelText="Company"
              helperText="The business you want to research."
              placeholder="Qahwa House"
            />
            <TextInput
              id="ds-email"
              labelText="Work email"
              defaultValue="ayesha@"
              invalid
              invalidText="Enter a full email address, like ayesha@fund.com."
            />
            <Select id="ds-market" labelText="Target market" defaultValue="Riyadh">
              {MARKETS.map((market) => (
                <SelectItem key={market} value={market} text={market} />
              ))}
            </Select>
            <Dropdown
              id="ds-industry"
              titleText="Industry"
              label="Choose an industry"
              items={['Food and beverage', 'Logistics', 'Retail', 'Fintech']}
            />
            <NumberInput
              id="ds-budget"
              label="Budget (credits)"
              min={0}
              max={500}
              step={10}
              value={120}
            />
            <Search
              id="ds-search"
              labelText="Search the library"
              placeholder="Search the library"
              size="md"
            />
            <div className={styles.fieldWide}>
              <TextArea
                id="ds-goal"
                labelText="Research goal"
                helperText="One or two sentences is enough."
                rows={3}
                defaultValue="Understand whether specialty coffee can support three new stores in north Riyadh."
              />
            </div>
          </div>
        </Layer>
      </Specimen>

      <Specimen
        id="selection"
        title="Selection controls"
        source="@carbon/react · Checkbox, RadioButton, Toggle, ContentSwitcher, Slider"
        description="Checkbox and radio edges use the slate control colour; selected segments use slate too."
      >
        <div className={styles.fieldGrid}>
          <CheckboxGroup legendText="Report formats">
            <Checkbox id="ds-pdf" labelText="PDF report" defaultChecked />
            <Checkbox id="ds-transcripts" labelText="Interview transcripts" />
            <Checkbox id="ds-data" labelText="Raw data" disabled />
          </CheckboxGroup>
          <RadioButtonGroup legendText="Interview format" name="ds-format" defaultSelected="voice">
            <RadioButton id="ds-voice" value="voice" labelText="Voice" />
            <RadioButton id="ds-text" value="text" labelText="Text" />
          </RadioButtonGroup>
          <Toggle id="ds-alerts" labelText="Email me when a report updates" defaultToggled />
          <Slider id="ds-experts" labelText="Experts to interview" min={1} max={12} value={6} />
          <div className={styles.fieldWide}>
            <ContentSwitcher onChange={() => undefined} size="md">
              <Switch name="list" text="List" />
              <Switch name="cards" text="Cards" />
              <Switch name="table" text="Table" />
            </ContentSwitcher>
          </div>
        </div>
      </Specimen>

      <Specimen
        id="status"
        title="Tags and status"
        source="@/shared/ui · StatusTag  ·  @carbon/react · Tag"
        description="Status is never colour alone: StatusTag pairs tone with an icon and a label."
      >
        <div className={styles.row}>
          {STATUS_TONES.map(({ tone, label }) => (
            <StatusTag key={tone} tone={tone} label={label} />
          ))}
        </div>
        <div className={styles.row}>
          <Tag type="gray">Food and beverage</Tag>
          <Tag type="cool-gray">Saudi Arabia</Tag>
          <Tag type="outline">Library report</Tag>
          <Tag type="high-contrast">New</Tag>
        </div>
      </Specimen>

      <Specimen
        id="notifications"
        title="Notifications"
        source="@carbon/react · InlineNotification"
        description="Inline for context, toast for async completion. Errors say what happened and how to fix it."
      >
        <div className={styles.stack}>
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Quote ready."
            subtitle="Review it before it expires on 29 Oct."
          />
          <InlineNotification
            kind="success"
            lowContrast
            hideCloseButton
            title="Report delivered."
            subtitle="It's in your workspace under Riyadh entry."
          />
          <InlineNotification
            kind="warning"
            lowContrast
            hideCloseButton
            title="15 credits left."
            subtitle="Top up to buy the next report."
          />
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Payment failed."
            subtitle="Your card was declined. Try another card."
          />
        </div>
      </Specimen>

      <Specimen
        id="navigation"
        title="Navigation"
        source="@carbon/react · Tabs, Breadcrumb, Link, ProgressIndicator"
        description="Breadcrumbs on detail pages, tabs for peer views, progress for multi-step flows."
      >
        <Breadcrumb noTrailingSlash>
          <BreadcrumbItem href="#">Library</BreadcrumbItem>
          <BreadcrumbItem href="#">Food and beverage</BreadcrumbItem>
        </Breadcrumb>
        <Tabs>
          <TabList aria-label="Report sections">
            <Tab>Summary</Tab>
            <Tab>Experts</Tab>
            <Tab>Sources</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Six experts agree north Riyadh can support three stores.</TabPanel>
            <TabPanel>Former operators, landlords and a supplier.</TabPanel>
            <TabPanel>14 interviews and 3 public filings.</TabPanel>
          </TabPanels>
        </Tabs>
        <ProgressIndicator currentIndex={1} spaceEqually>
          <ProgressStep label="Goal" />
          <ProgressStep label="Coverage" />
          <ProgressStep label="Quote" />
          <ProgressStep label="Delivery" />
        </ProgressIndicator>
        <p className={styles.sectionText}>
          Read the <Link href="#">methodology note</Link> before sharing.
        </p>
      </Specimen>

      <Specimen
        id="content"
        title="Content"
        source="@carbon/react · Tile, Accordion, Table, CodeSnippet"
        description="Tiles for previews, accordions for detail, tables for lists people compare."
      >
        <div className={styles.fieldGrid}>
          <Tile>
            <p className={styles.tokenLabel}>Qahwa House: Riyadh expansion</p>
            <p className={styles.tokenUsage}>24 pages · 6 experts · 40 credits</p>
          </Tile>
          <Accordion>
            <AccordionItem title="What's in a library report?">
              Expert interviews, a summary, and cited sources.
            </AccordionItem>
            <AccordionItem title="How are credits charged?">
              Only when the report is delivered.
            </AccordionItem>
          </Accordion>
        </div>
        <Table size="md" aria-label="Recent reports">
          <TableHead>
            <TableRow>
              <TableHeader>Report</TableHeader>
              <TableHeader>Experts</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {REPORTS.map((report) => (
              <TableRow key={report.id}>
                <TableCell>{report.title}</TableCell>
                <TableCell>{report.experts}</TableCell>
                <TableCell>
                  <StatusTag size="sm" tone={report.status} label={report.label} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <CodeSnippet type="single" feedback="Copied">
          REQ-2041
        </CodeSnippet>
      </Specimen>

      <Specimen
        id="loading"
        title="Loading"
        source="@carbon/react · SkeletonText, SkeletonPlaceholder, InlineLoading, ProgressBar"
        description="Skeletons for first load, inline loading for actions, progress bars for long tasks."
      >
        <div className={styles.fieldGrid}>
          <div className={styles.stack}>
            <SkeletonText heading />
            <SkeletonText paragraph lineCount={3} />
          </div>
          <SkeletonPlaceholder className={styles.skeleton} />
          <InlineLoading description="Saving brief…" />
          <ProgressBar label="Transcribing interview" helperText="3 of 5 minutes" value={60} />
        </div>
      </Specimen>

      <Specimen
        id="overlays"
        title="Overlays"
        source="@carbon/react · Modal"
        description="Modals for short, focused tasks only. Long flows get a full page."
      >
        <div className={styles.row}>
          <Button kind="tertiary" onClick={() => setIsModalOpen(true)}>
            Open modal
          </Button>
        </div>
        <Modal
          open={isModalOpen}
          modalHeading="Buy this report?"
          primaryButtonText="Buy for 40 credits"
          secondaryButtonText="Cancel"
          onRequestClose={() => setIsModalOpen(false)}
          onRequestSubmit={() => setIsModalOpen(false)}
        >
          <p>Qahwa House: Riyadh expansion goes to your workspace right away.</p>
        </Modal>
      </Specimen>

      <Specimen
        id="product"
        title="Xpert Network components"
        source="@/shared/ui · @/shared/ai"
        description="Product components that wrap Carbon. Use these before composing your own."
      >
        <div className={styles.fieldGrid}>
          <div className={styles.cardPreviewSurface}>
            <EmptyState
              headingLevel={3}
              pictogram={<Magnify aria-hidden="true" />}
              title="No reports match"
              description="Try a broader market or clear a filter."
              action={<Button size="sm">Clear filters</Button>}
            />
          </div>
          <div className={styles.stack}>
            <ErrorState
              message="The library didn't load. Check your connection and try again."
              onRetry={() => undefined}
            />
            <div className={styles.row}>
              <span className={styles.tokenUsage}>AI-drafted brief</span>
              <AIExplainLabel aria-label="Research brief" />
            </div>
          </div>
        </div>
      </Specimen>
    </div>
  );
}

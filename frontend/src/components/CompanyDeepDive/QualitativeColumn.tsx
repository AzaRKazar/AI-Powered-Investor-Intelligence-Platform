type Variant = 'driver' | 'risk';

interface QualitativeColumnProps {
  variant: Variant;
  items: string[];
}

const CONFIG: Record<
  Variant,
  {
    titleClass: string;
    titleIcon: string;
    titleText: string;
    itemIconClass: string;
    itemIcon: string;
    emptyIcon: string;
    emptyText: string;
  }
> = {
  driver: {
    titleClass: 'qual-col-title drivers-title',
    titleIcon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    titleText: 'Top Growth Drivers',
    itemIconClass: 'qual-item-icon driver-item-icon',
    itemIcon: 'M5 13l4 4L19 7',
    emptyIcon:
      'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75c-.304 0-.603-.04-.896-.12l-.548-.547z',
    emptyText: 'No growth drivers parsed for this report.',
  },
  risk: {
    titleClass: 'qual-col-title risks-title',
    titleIcon:
      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    titleText: 'Top Risk Factors',
    itemIconClass: 'qual-item-icon risk-item-icon',
    itemIcon:
      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    emptyIcon:
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    emptyText: 'No high-risk factors identified for this period.',
  },
};

export function QualitativeColumn({ variant, items }: QualitativeColumnProps) {
  const config = CONFIG[variant];

  return (
    <div className="qualitative-column">
      <h3 className={config.titleClass}>
        <svg viewBox="0 0 24 24">
          <path d={config.titleIcon} />
        </svg>
        <span>{config.titleText}</span>
      </h3>
      <div className="qual-list">
        {items.length > 0 ? (
          items.map((item) => (
            <div className="qual-item" key={item}>
              <div className={config.itemIconClass}>
                <svg viewBox="0 0 24 24">
                  <path d={config.itemIcon} stroke="currentColor" />
                </svg>
              </div>
              <div>{item}</div>
            </div>
          ))
        ) : (
          <div className="no-qualitative">
            <svg viewBox="0 0 24 24">
              <path d={config.emptyIcon} />
            </svg>
            <span>{config.emptyText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

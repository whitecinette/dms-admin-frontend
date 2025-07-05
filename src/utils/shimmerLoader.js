import React from 'react';
import './style.scss';

const ShimmerLoader = () => {
  return (
    <div className="shimmer-wrapper">
      <h2 className="overview-heading">Overview</h2>
      {/* Overview Section Shimmer */}
      <div className="overview-section-shimmer">
        <div className="overview-chart-shimmer shimmer">
          {/* Donut chart placeholder */}
          <div style={{ height: '200px', width: '100%' }} className="shimmer" />
          {/* Legend placeholder */}
          <div className="overview-legend">
            {[...Array(4)].map((_, index) => (
              <div className="legend-item" key={index}>
                <span className="dot shimmer" style={{ width: '12px', height: '12px' }} />
                <span className="shimmer" style={{ width: '60px', height: '12px' }} />
              </div>
            ))}
          </div>
        </div>
        <div className="overview-line-chart-shimmer shimmer">
          {/* Line chart header placeholder */}
          <div className="line-chart-header-shimmer">
            <div className="line-chart-title-shimmer shimmer" />
            <div className="week-selector-shimmer shimmer" />
          </div>
          {/* Line chart placeholder */}
          <div style={{ height: '200px', width: '100%' }} className="shimmer" />
        </div>
      </div>
      {/* Firm Cards Grid Shimmer */}
      <div className="attendance-cards-grid-shimmer">
        {[...Array(4)].map((_, index) => ( // Adjust number based on expected cards
          <div className="attendance-card-shimmer shimmer" key={index}>
            <div className="chart-wrapper-shimmer shimmer" />
            <div className="firm-name-shimmer shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShimmerLoader;
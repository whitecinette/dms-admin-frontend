import React, { useEffect, useRef, useMemo, useState } from "react";
import moment from "moment";
import { Timeline } from "vis-timeline";
import { DataSet } from "vis-data"; // ✅ fix here
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import "./style.scss";

const TimelineView = ({ data = [], startDay: parentStart, endDay: parentEnd, onDateChange }) => {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

  const [startDay, setStartDay] = useState(parentStart || moment().startOf("month").toDate());
  const [endDay, setEndDay] = useState(parentEnd || moment().endOf("month").toDate());

  useEffect(() => {
    if (parentStart) setStartDay(parentStart);
    if (parentEnd) setEndDay(parentEnd);
  }, [parentStart, parentEnd]);

  const handleDateChange = (newStart, newEnd) => {
    let fixedStart = newStart;
    let fixedEnd = newEnd;
    if (fixedStart && fixedEnd && fixedStart > fixedEnd) fixedEnd = fixedStart;
    setStartDay(fixedStart);
    setEndDay(fixedEnd);
    onDateChange?.(fixedStart, fixedEnd);
  };

  // 🔹 Prepare timeline data
  const { groups, items } = useMemo(() => {
    const groupsArr = [];
    const itemsArr = [];

    data.forEach((asm) => {
      groupsArr.push({
        id: asm.code,
        content: `<b>${asm.name}</b>`,
      });

      (asm.schedule || [])
        .filter((d) => d.status === "done")
        .forEach((dealer, i) => {
          const doneTime = dealer.markedDoneAt ? moment(dealer.markedDoneAt) : null;
          itemsArr.push({
            id: `${asm.code}-${i}`,
            group: asm.code,
            start: doneTime ? doneTime.toDate() : startDay,
            dealer,
          });
        });
    });

    return { groups: groupsArr, items: itemsArr };
  }, [data, startDay, endDay]);

  const options = useMemo(
    () => ({
      stack: true,
      start: startDay,
      end: endDay,
      editable: false,
      zoomable: true,
      selectable: true,
      multiselect: false,
      margin: { item: 8, axis: 5 },
      orientation: "both",
      showCurrentTime: false,
      height: "100%",
      maxHeight: "600px",
      groupHeightMode: "fixed",
      groupMinHeight: 35,

      // ✅ Render custom compact dealer cards
template: (item) => {
  const d = item.dealer;
  if (!d) return "—";
  const doneTime = d.markedDoneAt ? moment(d.markedDoneAt).format("hh:mm A") : "—";

  const wrapper = document.createElement("div");
  wrapper.className = "dealer-card compact";
  wrapper.innerHTML = `
    <div class="dealer-header">
      <span class="dealer-dot"></span>
      <span class="dealer-name">${d.name || "Unnamed Dealer"}</span>
      <span class="dealer-chip">${d.visited || 0}</span>
    </div>
    <div class="dealer-details">
      <div>${d.code || "—"}</div>
      <div>${d.taluka || "—"}</div>
    </div>
    <div class="dealer-time">${doneTime}</div>
  `;
  return wrapper;
},

    }),
    [startDay, endDay]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    if (timelineRef.current) {
      try {
        timelineRef.current.destroy();
      } catch {}
      timelineRef.current = null;
    }
    if (items.length === 0 || groups.length === 0) return;

    try {
      const timeline = new Timeline(
        containerRef.current,
        new DataSet(items),
        new DataSet(groups),
        options
      );
      timelineRef.current = timeline;
    } catch (e) {
      console.error("Timeline init failed:", e);
    }

    return () => {
      if (timelineRef.current) {
        try {
          timelineRef.current.destroy();
        } catch {}
        timelineRef.current = null;
      }
    };
  }, [items, groups, options]);

  return (
    <div className="timeline-view">
      <div className="timeline-header">
        <h2>Market Activity Timeline</h2>
        <div className="right-tools">
          <div className="date-range">
            <div className="date">
              <label>From:</label>
              <input
                type="date"
                value={moment(startDay).format("YYYY-MM-DD")}
                max={moment(endDay).format("YYYY-MM-DD")}
                onChange={(e) => handleDateChange(new Date(e.target.value), endDay)}
              />
            </div>
            <div className="date">
              <label>To:</label>
              <input
                type="date"
                value={moment(endDay).format("YYYY-MM-DD")}
                min={moment(startDay).format("YYYY-MM-DD")}
                onChange={(e) => handleDateChange(startDay, new Date(e.target.value))}
              />
            </div>
          </div>

          <button className="download-btn" onClick={() => alert("CSV soon!")}>
            Download CSV
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="no-data">No done dealers found for this range.</div>
      ) : (
        <div
          ref={containerRef}
          style={{
            height: "600px",
            borderRadius: "16px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        />
      )}
    </div>
  );
};

export default TimelineView;

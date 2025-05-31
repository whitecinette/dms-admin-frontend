import React, { useState, useEffect } from 'react';
import { GiPathDistance } from "react-icons/gi";
import './style.scss';

function EmployeeSchedule({ schedule, isClose, selectedRoute, data, expandedRow }) {
    const [expandedSearch, setExpandedSearch] = useState('');
    const [filteredSchedule, setFilteredSchedule] = useState(schedule || []);
    const [status, setStatus] = useState('');

    const handleExpandedSearch = (e) => {
        setExpandedSearch(e.target.value);
    };

    const getFilteredSchedule = () => {
        let result = schedule || [];

        if (status) {
            result = result.filter((item) => item.status === status);
        }

        if (expandedSearch) {
            const searchTerm = expandedSearch.toLowerCase();
            result = result.filter((item) =>
                [
                    item.code,
                    item.name,
                    item.district,
                    item.taluka,
                    item.zone,
                    item.position,
                ].some((field) => field?.toLowerCase().includes(searchTerm))
            );
        }

        if (selectedRoute[expandedRow]) {
            const route = data[expandedRow]?.routes?.find(
                (r) => r.id === selectedRoute[expandedRow]
            );
            if (route) {
                const { zones, districts, talukas } = route.itinerary || {};
                result = result.filter((item) => {
                    return (
                        (zones?.length === 0 || zones?.includes(item.zone)) &&
                        (districts?.length === 0 || districts?.includes(item.district)) &&
                        (talukas?.length === 0 || talukas?.includes(item.taluka))
                    );
                });
            }
        }

        return result;
    };

    useEffect(() => {
        setFilteredSchedule(getFilteredSchedule());
    }, [expandedSearch, status, schedule, selectedRoute, expandedRow, data]);

    return (
        <div className="employeeSchedule" onClick={isClose}>
            <div className="employeeSchedule-container" onClick={(e) => e.stopPropagation()}>
                <div className="sticky-header">
                    <div className="employeeSchedule-header">
                        <h3>Employee Schedule</h3>
                        <button className="close-btn" onClick={isClose}>
                            ✕
                        </button>
                    </div>
                    <div className="expand-container-filter">
                        <input
                            type="text"
                            placeholder="Search by code, name, district, taluka, zone or position"
                            value={expandedSearch}
                            onChange={handleExpandedSearch}
                        />
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="done">Done</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>
                <div className="expand-container-body">
                    <div className="schedule-cards">
                        {filteredSchedule.length === 0 ? (
                            <div className="no-data">
                                No matching schedules
                            </div>
                        ) : (
                            filteredSchedule.map((scheduleItem, sIndex) => {
                                const isDone = scheduleItem.status === "done";
                                return (
                                    <div
                                        key={scheduleItem._id || `schedule-${sIndex}`}
                                        className={`schedule-card ${isDone ? "done" : "pending"}`}
                                    >
                                        <div className="card-top-row">
                                            <span className="card-code">
                                                {scheduleItem.code || "N/A"}
                                            </span>
                                            {scheduleItem.visited > 1 && (
                                                <span
                                                    className={`visit-badge ${isDone ? "done" : "pending"}`}
                                                >
                                                    {scheduleItem.visited} {scheduleItem.visited === 1 ? 'Visit' : 'Visits'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="card-name">
                                            {scheduleItem.name || "N/A"}
                                        </div>
                                        <div className="card-tags">
                                            {scheduleItem.zone && (
                                                <span className="tag">{scheduleItem.zone}</span>
                                            )}
                                            {scheduleItem.district && (
                                                <span className="tag">{scheduleItem.district}</span>
                                            )}
                                            {scheduleItem.taluka && (
                                                <span className="tag">{scheduleItem.taluka}</span>
                                            )}
                                            {scheduleItem.position && (
                                                <span className="tag">{scheduleItem.position}</span>
                                            )}
                                        </div>
                                        <div className="card-bottom-row">
                                            {scheduleItem.distance ? (
                                                <span className="distance-icon">
                                                    <GiPathDistance size={24} />
                                                    {scheduleItem.distance.slice(0, 4)} Km
                                                </span>
                                            ) : (
                                                <span className="distance-icon">
                                                    <GiPathDistance size={24} />
                                                    N/A
                                                </span>
                                            )}
                                            <div className="card-status-row">
                                                <span
                                                    className={`status-pill ${isDone ? "done" : "pending"}`}
                                                >
                                                    {isDone ? (
                                                        <>
                                                            Done <span className="checkmark">✔</span>
                                                        </>
                                                    ) : (
                                                        "Pending"
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmployeeSchedule;
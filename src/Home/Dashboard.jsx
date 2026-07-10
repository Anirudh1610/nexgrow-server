import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import '../components/UITheme.css';

const Dashboard = () => {
	const navigate = useNavigate();

	return (
		<div className="app-shell">
			<AppHeader />
			<main className="page fade-in">
				<div className="mobile-stack" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem'}}>
                    <h1 className="section-title mobile-center" style={{margin: 0, fontSize: 'clamp(1.3rem, 4vw, 1.5rem)', color: 'var(--color-dim-text)'}}>Dashboard</h1>
                    <button className="btn secondary mobile-full-width" onClick={() => navigate('/home')}>Back to Home</button>
                </div>

				{/* Coming Soon Container */}
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					minHeight: '60vh',
					background: 'var(--brand-surface)',
					borderRadius: '12px',
					border: '2px dashed var(--brand-border)',
					textAlign: 'center',
					padding: '3rem',
					opacity: 0.8,
				}}>
					<div style={{
						fontSize: '4rem',
						marginBottom: '1rem',
						opacity: 0.3
					}}>
						📊
					</div>
					<h2 style={{
						fontSize: 'clamp(1.5rem, 4vw, 2rem)',
						color: 'var(--color-dim-text)',
						marginBottom: '1rem',
						fontWeight: 600
					}}>
						Dashboard Coming Soon
					</h2>
					<p style={{
						fontSize: '1.1rem',
						color: 'var(--brand-text-soft)',
						maxWidth: '500px',
						lineHeight: 1.6,
						marginBottom: '2rem'
					}}>
						We're working on building comprehensive analytics and insights for your business.
						Stay tuned for detailed reports, charts, and key performance indicators.
					</p>
					<div style={{
						display: 'flex',
						gap: '1rem',
						flexWrap: 'wrap',
						justifyContent: 'center'
					}}>
						<div style={{
							background: 'var(--color-chip-bg)',
							padding: '0.75rem 1.5rem',
							borderRadius: '8px',
							color: 'var(--color-chip-text)',
							fontSize: '0.9rem',
							fontWeight: 500
						}}>
							Sales Analytics
						</div>
						<div style={{
							background: 'var(--color-chip-bg)',
							padding: '0.75rem 1.5rem',
							borderRadius: '8px',
							color: 'var(--color-chip-text)',
							fontSize: '0.9rem',
							fontWeight: 500
						}}>
							Performance Reports
						</div>
						<div style={{
							background: 'var(--color-chip-bg)',
							padding: '0.75rem 1.5rem',
							borderRadius: '8px',
							color: 'var(--color-chip-text)',
							fontSize: '0.9rem',
							fontWeight: 500
						}}>
							Key Metrics
						</div>
					</div>
				</div>
			</main>
		</div>
	);
};

export default Dashboard;

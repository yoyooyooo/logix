import { PatternGallery } from '../components/pattern-gallery'
import { Link } from 'react-router-dom'

export function PatternsRoute() {
  return (
    <div className="workspace">
      <section className="card">
        <div className="badge" style={{ background: '#ecfccb', color: '#4d7c0f' }}>Patterns</div>
        <h2>平台模式库</h2>
        <div className="actions-row">
          <Link className="primary-button" to="/patterns/new">
            新建模式
          </Link>
        </div>
        <PatternGallery />
      </section>
    </div>
  )
}

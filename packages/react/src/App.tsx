import "./App.css"
import { EffectProvider, RegionCascade } from "@/features/region-cascade"
import { FormDemoPage } from "@/features/form/FormDemoPage"
import { Link, Route, Routes } from "react-router-dom"

function Home() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">场景导航</h2>
	      <p className="text-sm text-gray-600 mb-4">
	        选择一个场景进入对应的交互页面。
	      </p>
	      <ul className="space-y-2">
	        <li>
	          <Link
	            to="/region-cascade"
            className="block border rounded p-3 hover:bg-gray-50"
          >
            <div className="font-medium">省市区联动</div>
            <div className="text-xs text-gray-500 mt-1">
	              Effect + Stream 驱动的省市区级联选择。
	            </div>
	          </Link>
	        </li>
	        <li>
	          <Link
	            to="/form-demo"
	            className="block border rounded p-3 hover:bg-gray-50"
	          >
	            <div className="font-medium">表单状态机 Demo</div>
	            <div className="text-xs text-gray-500 mt-1">
	              使用 Effect + Stream 驱动的简单登录表单示例。
	            </div>
	          </Link>
	        </li>
	      </ul>
	    </div>
	  )
}

export default function App() {
  return (
    <EffectProvider>
      <div className="container mx-auto p-8">
	        <header className="mb-6 border-b pb-4 flex items-center justify-between">
	          <h1 className="text-2xl font-bold">Effect 场景实验场</h1>
	          <nav className="flex gap-4 text-sm">
            <Link to="/" className="text-blue-600 hover:underline">
              场景导航
            </Link>
	            <Link to="/region-cascade" className="text-blue-600 hover:underline">
	              省市区联动
	            </Link>
	            <Link to="/form-demo" className="text-blue-600 hover:underline">
	              表单 Demo
	            </Link>
	          </nav>
	        </header>

	        <main>
	          <Routes>
	            <Route path="/" element={<Home />} />
	            <Route path="/region-cascade" element={<RegionCascade />} />
	            <Route path="/form-demo" element={<FormDemoPage />} />
	            {/* 新场景：<Route path="/xxx" element={<XxxFeature />} /> */}
	          </Routes>
	        </main>
	      </div>
    </EffectProvider>
  )
}

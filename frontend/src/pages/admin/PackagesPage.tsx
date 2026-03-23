import { useSearchParams } from 'react-router-dom';
import PackagesTable from '../../components/admin/PackagesTable';

const PackagesPage = () => {
	const [searchParams] = useSearchParams();
	const initialStatus = searchParams.get('status') || '';

	return (
		<div className="max-w-[1600px] mx-auto h-[calc(100vh-140px)] animate-in fade-in">
			{/* isDashboard={false} включает поиск и пагинацию */}
			<PackagesTable isDashboard={false} initialStatus={initialStatus} />
		</div>
	);
};

export default PackagesPage;
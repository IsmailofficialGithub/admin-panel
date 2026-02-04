// src/app/admin/brands/page.jsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CreateBrandModal } from "@/components/admin/CreateBrandModal";
import { BrandTable } from "@/components/admin/BrandTable";
import { EditBrandModal } from "@/components/admin/EditBrandModal";
import { useBrands } from "@/lib/hooks/useBrands";

export default function AdminBrandsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [EditBrandModalOpen, setEditBrandModalOpen] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [isfetchBrands, setIsfetchBrands] = useState(false);
  const { deleteBrand, updateBrand, refetch } = useBrands();

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Brand Management</h2>
          <p className="text-gray-600 mt-1">Create and manage brand profiles</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          + Create Brand
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <BrandTable
          isrefetch={isfetchBrands}
          setIsRefresh={setIsfetchBrands}
          onEdit={(brand) => {
            setBrandId(brand.id);
            setEditBrandModalOpen(true);
          }}
          onDelete={async (brand) => {
            if (confirm(`Are you sure you want to delete ${brand.name}?`)) {
              const result = await deleteBrand(brand.id);

              if (result.success) {
                setIsfetchBrands(true); // ✅ only after deletion success
              } else {
                alert(result.error || "Failed to delete brand");
              }
            }
          }}
        />
      </div>

      <CreateBrandModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsfetchBrands(true);
        }}
      />
      <EditBrandModal
        isOpen={EditBrandModalOpen}
        onClose={() => {
          setEditBrandModalOpen(false);
        }}
        onSuccess={() => {}}
        brandId={brandId}
      />
    </div>
  );
}

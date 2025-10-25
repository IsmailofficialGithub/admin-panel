"use client";

import {  useEffect, useState } from "react";
import { ConsumerRow } from "./ConsumerRow";
import { DeleteConsumerModal } from "./DeleteConsumerModel";
import { useConsumer } from "@/lib/hooks/useConsumer";

export function ConsumerTable({isrefresh,setIsrefresh}) {
  const { consumers, loading, refetch } = useConsumer();
  const [deleteUser, setDeleteUser] = useState(null);

  useEffect(() => {
    refetch();
    setIsrefresh(false);
  }, [isrefresh]);


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading consumers...</div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {consumers.map((consumer,index) => (
              <ConsumerRow
                key={index}
                user={consumer}
                onDelete={setDeleteUser}
              />
            ))}
          </tbody>
        </table>

        {consumers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No consumers found. Create your first user! 
          </div>
        )}
      </div>

      <DeleteConsumerModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        user={deleteUser}
        onSuccess={refetch}
      />
    </>
  );
}
